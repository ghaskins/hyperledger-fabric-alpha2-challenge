/*
Copyright 2017 BlocLedger

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/* jshint node: true */
'use strict';

process.env.NODE_ENV = 'production';
process.env.UV_THREADPOOL_SIZE = 64;

var app = require('express')();
var morgan = require('morgan');
var bodyparser = require('body-parser');
var atob = require('atob');
var path = require('path');
var fs = require('fs');
var util = require('./util.js');
var Q = require('q');
var debug = require('debug')('poe');
var rest = require('rest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var restClient = rest.wrap(mime).wrap(errorCode, {code: 400});
var config = require('./configuration.js');
var GlobalAppUser = {};
var request = require('request');
var rp = require('request-promise-native');
var sa = require('superagent');
var init = require('./initialize.js');
var sdkInterface = require('./sdkInterface');
var poeRouter = require('./poeRouter.js'); // POE middleware to handle all of the POE REST endpoints
var sha = require('js-sha256');

var newUser = util.newUser;
var PwStr = 'Pw!';

app.set('port', (process.env.PORT || 3000));

var chainHeight = 1;
var blockList = [];

// Path to the local directory containing the chaincode project under $GOPATH
process.env.GOPATH = path.join(__dirname, 'chaincode');
debug(process.env.GOPATH);

// Confidentiality setting
var confidentialSetting = config.confidentialSetting;

// Store the exports from initialize.js in global variables
var chain = init.chain;
var GlobalAppUser = init.GlobalAppUser;

var cred = config.cred;

// setup the sdk interface
var retrySdkInvoke = sdkInterface.retrySdkInvoke;
var retrySdkQuery = sdkInterface.retrySdkQuery;

app.use(morgan('dev'));
app.use(require('express').static(__dirname + '/public'));
app.use(require('cookie-parser')());
app.use(bodyparser.json());
app.use(require('cookie-session')({
  name: 'session',
  keys: ['A cookie secret'],
  maxAge: 24 * 60 * 60 * 1000,
}));
bodyparser.urlencoded({extended: true});

app.use('/', poeRouter);  // handle the POE REST endpoint routes

app.get('/', function(req, res) {
  debug('Display basic home page.');
  res.sendfile('./public/' + 'index.html');
});

// provide an endpoint that will deploy the chaincode
app.get('/deploy', function(req, res) {
  // check to see if the user is enrolled
  var appUser = GlobalAppUser[req.session.appUser];
  if (!appUser) {
    console.log('Deploy failed. No user present.');
    return res.status(500).send('Deploy failed. No user present.');
  }

  sdkInterface.deploy(req, res);
});

app.get('/activeUser', function(req, res) {
  console.log('active user: ' + req.session.appUser);
  if (req.session.appUser) {
    return res.send('Log out ' + req.session.appUser.split('@')[0]);
  }
  res.send('Click to log in');
});

app.put('/resetUser', function(req, res) {
  res.send('Click to log in');
});

app.get('/chain/transactions/:id', function(req, res) {
  console.log('Get a transaction by ID: ' + req.params.id);
  var appUser = GlobalAppUser[req.session.appUser];
  init.client.setUserContext(appUser.hfcUser, true)
  .then(function(user) {
    console.log('user is ', user.getName());
    return init.chain.queryTransaction(req.params.id);
  })
  .then(function(result) {
    debug(result);
    res.json(result);
  })
  .catch(function(err) {
    console.log(err);
    res.status(500).send(err.msg);
  });
});

app.get('/adminPriv', function(req, res) {
  var adminSet = true; var anAdmin = false;
  if (GlobalAppUser) {
    Object.keys(GlobalAppUser).forEach(function(userName) {
      let usr = GlobalAppUser[userName];
      if (usr.userType == 'admin') {
        anAdmin = true;
      }
    });
  }
  if (req.session.appUser && anAdmin) {
    adminSet = GlobalAppUser[req.session.appUser].userType == 'admin';
  }
  if (!req.session.appUser && anAdmin) {
    adminSet = false;
  }
  var adminObj = {'adminPriv': adminSet};
  res.json(adminObj);
});

app.get('/loggedIn', function(req, res) {
  var loggedIn = false;
  if (req.session.appUser) {
    loggedIn = true;
  }
  var loginObj = {'loggedIn': loggedIn};
  res.json(loginObj);
});

app.get('/login', function(req, res) {
  console.log('Login/out: ' + req.user);
  if (req.user) {
    req.logout();
  }
  if (req.session.appUser) {
    req.session.appUser = null;
  }
  if (req.session.rememberUserName && !GlobalAppUser[req.session.rememberUserName]) {
    req.session.rememberUserName = null;
  }
  var userName = {'userName': req.session.rememberUserName};
  res.json(userName);
});

app.post('/login', function(req, res) {
  var params = req.body;
  var pwHash = sha.sha256(PwStr + params.userName + params.userPw);
  var retVal = true;

  console.log('Login post: ' + params.userName);

  var appUser = GlobalAppUser[params.userName];
  if (appUser) {
    console.log('app user:'); console.log(appUser);
    if (pwHash !== appUser.pwHash) {
      retVal = false;
    } else {
      if (params.remember) {
        console.log('remember ' + appUser.userName);
        req.session.rememberUserName = appUser.userName;
      }
      console.log('Set appUser: ' + appUser.userName);
      req.session.appUser = appUser.userName;
      res.redirect('/');
      return;
    }
  } else {
    retVal = false;
  }

  if (!retVal) {
    res.status(500).send('Login failed');
    return false;
  }
  res.status(200).send('success');
  return true;
});

function writeUsers() {
  var users = [];
  var appUserStr;
  let store = init.client.getStateStore();
  Object.keys(GlobalAppUser).forEach(function(userName) {
    let usr = GlobalAppUser[userName];
    let newUsr = {userName: usr.userName, pwHash: usr.pwHash,
      userType: usr.userType};
    users.push(newUsr);
  });
  try {
    appUserStr = JSON.stringify(users) + '\n';
  } catch (e) {
    console.log('stringify error: ' + e);
  }
  return store.setValue('appUsers', appUserStr);
}

app.post('/addUser', function(req, res) {
  var params = req.body;
  var appUser = null;
  var userName = params.userName.toLowerCase();

  console.log('Add user post: ' + userName);
  appUser = GlobalAppUser[userName];
  if (appUser) {
    res.status(500).send('User name is already in use');
    return;
  }

  if (!params.userPw) {
    res.status(500).send('Missing password');
    return;
  }
  if (params.userPw != params.userPwRepeat) {
    res.status(500).send('Passwords do not match');
    return;
  }
  var pwHash = sha.sha256(PwStr + userName + params.userPw);
  var userType = params.userType;
  if (userType === undefined || !userType) {
    userType = 'user';
  }

  var user = {userName: userName, pwHash: pwHash, userType: userType};
  GlobalAppUser[userName] = user;
  newUser(user);

  writeUsers();

  res.status(200).send('User added');
  return;
});

app.post('/editUser', function(req, res) {
  var params = req.body;
  var appUser = null;
  var userName = params.userName.toLowerCase();

  console.log('Edit user post: ' + userName);
  appUser = GlobalAppUser[userName];
  if (!appUser) {
    res.status(500).send('User name not found');
    return;
  }

  if (params.userPw) {
    if (params.userPw != params.userPwRepeat) {
      res.status(500).send('Passwords do not match');
      return;
    }
    var pwHash = sha.sha256(PwStr + userName + params.userPw);
    appUser.pwHash = pwHash;
  }
  var userType = params.userType;
  if (userType) {
    appUser.userType = userType;
  }

  writeUsers();

  res.status(200).send('User edited');
  return;
});

app.post('/delUser', function(req, res) {
  var params = req.body;
  var retVal = true;
  var userName = params.delUserName.toLowerCase();

  console.log('Delete user post: ' + userName);

  var appUser = GlobalAppUser[userName];
  if (appUser) {
    delete GlobalAppUser[userName];

    if (userName == req.session.appUser) {
      if (req.user) {
        req.logout();
      }
      req.session.appUser = null;
    }
    if (userName == req.session.rememberUserName) {
      req.session.rememberUserName = null;
    }
  } else {
    return res.status(500).send('User name not found');
  }

  writeUsers()
    .then(function() {
      if (!req.session.appUser) {
        console.log('Removed appUser');
        // Send status 201 to indicate that we removed the current logged-in user.
        // Tried using res.redirect() here, without success.
        res.status(201).send('success');
      }
      res.status(200).send('success');
    })
    .catch(function(err) {
      console.log(err);
    });
});

app.use(function(err, req, res, next) {
  console.log('unhandled error detected: ' + err.message + '\nurl: ' + req.url);
  res.type('text/plain');
  res.status(500);
  res.send('500 - server error');
});

app.use(function(req, res) {
  console.log('route not handled: ' + req.url);
  res.type('text/plain');
  res.status(404);
  res.send('404 - not found');
});

app.listen(app.get('port'), function() {
  console.log('listening on port', app.get('port'));
});
