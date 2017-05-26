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

///////////////////////////////////////////////////
//
//  POE application REST endpoints
//
///////////////////////////////////////////////////
// Add support for the Applicaion specific REST calls
// addDoc, listDoc, transferDoc, verifyDoc, and delDoc

/* jshint node: true */
'use strict';

var express = require('express');
var router = express.Router();
var retryCount = require('./configuration.js').retryCount;  // SDK retry count
var sdkInterface = require('./sdkInterface.js');
var init = require('./initialize.js');
var debug = require('debug')('poe');

var GlobalAppUser = init.GlobalAppUser;
var poeChaincode = init.poeChaincode;

var confidentialSetting = false;

// setup the sdk interface
var retrySdkInvoke = sdkInterface.retrySdkInvoke;
var retrySdkQuery = sdkInterface.retrySdkQuery;

// addDoc  Add a new document to the block chain
router.post('/addDoc', function(req, res) {
  debug('/addDoc request body %j', req.body);
  var hashValid = true;
  if (!req.body.hash) {
    hashValid = false;
    console.log('no hash provided');
  } else if (req.body.hash == 'file hash') {
    hashValid = false;
  } else if (req.body.hash.length != 64) {
    hashValid = false;
  }

  if (hashValid === false) {
    console.log('The hash is invalid.');
    return res.status(500).send('Error: invalid hash');
  }

  debug('hash equals %s', req.body.hash);
  var params = req.body;
  var hash = req.body.hash;
  var appUser = GlobalAppUser[req.session.appUser];
  debug(appUser);
  params.owner = appUser.userName;

  var invokeRequest = {
    chaincodeID: poeChaincode.id,
    fcn: 'addDoc',
    args: [hash, JSON.stringify(params)],
    confidential: confidentialSetting
  };
  debug('The invoke args = ', invokeRequest.args);

  retrySdkInvoke(appUser.hfcUser, invokeRequest, retryCount)
  .then(function(results) {
    console.log('The completion results for /addDoc %j', results);
    if (results instanceof Error) {
      res.status(500).send(results.msg);
    }
    res.json(results);
  }, function(err) {
    // Invoke transaction submission failed
    var msg = 'unknown error';
    if (!err) {
      msg = 'error undefined';
    } else if (err.msg) {
      msg = err.msg;
    } else if (err.context) {
      debug(err.context);
      msg = err.context.msg;
    } else if (err.message) {
      msg = err.message;
    }
    console.log('Invoke failed for addDoc: ' + msg);
    debug(err);
    res.status(500).send(msg);
  });
});

router.get('/verifyDoc/:hash', function(req, res) {
  debug('received /verifyDoc with hash = %s', req.params.hash);
  var appUser = GlobalAppUser[req.session.appUser];

  var queryRequest = {
    chaincodeID: poeChaincode.id,
    fcn: 'readDoc',
    args: [req.params.hash]
  };

  retrySdkQuery(appUser.hfcUser, queryRequest, retryCount)
  .then(function(results) {
    debug('successfully queried an existing document: ');
    debug(typeof(results));
    debug(results);
    results.forEach(function(result) {
      debug(result.toString());
    });
    if (results.length !== 0) {
      var params = JSON.parse(results);
      debug(params);
      res.json(params);
    } else {
      res.status(500).send('Document not found');
    }
  }, function(err) {
    var msg = 'unknown error';
    if (!err) {
      msg = 'error undefined';
    } else if (err.msg) {
      msg = err.msg;
    } else if (err.context) {
      debug(err.context);
      msg = err.context.msg;
    } else if (err.message) {
      msg = err.message;
    }
    console.log('/verifyDoc query failed: ', msg);
    res.status(500).send(msg);
  });
});

// list document
// returns a list of all of the documents
router.get('/listDoc', function(req, res) {
  debug('received /listDoc');
  var appUser = GlobalAppUser[req.session.appUser];

  var queryRequest = {
    chaincodeID: poeChaincode.id,
    fcn: 'listDoc',
    args: []
  };

  retrySdkQuery(appUser.hfcUser, queryRequest, retryCount)
  .then(function(results) {
    debug('successfully queried for the document list.');
    debug(results);
    if (results.length !== 0) {
      var list = JSON.parse(results);
      debug(list);
      res.json(list);
    } else {
      res.status(500).send('Document list invalid');
    }
  }, function(err) {
    var msg = 'unknown error';
    if (!err) {
      msg = 'error undefined';
    } else if (err.msg) {
      msg = err.msg;
    } else if (err.context) {
      debug(err.context);
      msg = err.context.msg;
    } else if (err.message) {
      msg = err.message;
    }
    console.log('/listDoc query failed: ', msg);
    res.status(500).send(msg);
  });
});

// delDoc  Delete a document from the block chain
router.post('/delDoc', function(req, res) {
  debug('/delDoc request body %j', req.body);
  var appUser = GlobalAppUser[req.session.appUser];

  debug('hash equals %s', req.body.hash);
  var hash = req.body.hash;

  var invokeRequest = {
    chaincodeID: poeChaincode.id,
    fcn: 'delDoc',
    args: [hash],
    confidential: confidentialSetting
  };
  debug('The invoke args = ', invokeRequest.args);

  retrySdkInvoke(appUser.hfcUser, invokeRequest, retryCount)
  .then(function(results) {
    console.log('The completion results for /delDoc %j', results);
    res.json(results);
  }, function(err) {
    // Invoke transaction submission failed
    var msg = 'unknown error';
    if (!err) {
      msg = 'error undefined';
    } else if (err.msg) {
      msg = err.msg;
    } else if (err.context) {
      debug(err.context);
      msg = err.context.msg;
    } else if (err.message) {
      msg = err.message;
    }
    console.log('Invoke failed for delDoc: ' + msg);
    res.status(500).send(msg);
  });
});

// editDoc  changes the owner of the doc but may be enhanced to include other parameters
router.post('/editDoc', function(req, res) {
  debug('/editDoc request body %j', req.body);
  var appUser = GlobalAppUser[req.session.appUser];
  var hash = req.body.hash;

  var invokeRequest = {
    chaincodeID: poeChaincode.id,
    fcn: 'transferDoc',
    args: [req.body.hash, req.body.owner],
    confidential: confidentialSetting
  };
  debug('The invoke args = ', invokeRequest.args);

  retrySdkInvoke(appUser.hfcUser, invokeRequest, retryCount)
  .then(function(results) {
    console.log('The completion results for /transferDoc %j', results);
    res.json(results);
  }, function(err) {
    // Invoke transaction submission failed
    debug('POE transferDoc invoke failed.');
    debug(err);
    var msg = 'unknown error';
    if (!err) {
      msg = 'error undefined';
    } else if (err.msg) {
      msg = err.msg;
    } else if (err.context) {
      debug(err.context);
      msg = err.context.msg;
    } else if (err.message) {
      msg = err.message;
    }
    console.log('Invoke failed for transferDoc: ' + msg);
    res.status(500).send(msg);
  });
});

module.exports = router;
