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

var debug = require('debug')('poe');
var util = require('util');

var config = require('./configuration.js');
var User = require('fabric-client/lib/User.js');
var init = require('./initialize.js');

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers

// Set up a new user
function newUser(appUser) {
  var retVal = true;
  var client = init.client;
  var ca = init.ca;
  var registrar = init.admin;
  var mspid = config.cred.cas[0].msp_id;

  var store = client.getStateStore();

  // register and enroll a new user
  var user;
  return client.loadUserFromStateStore(appUser.userName)
  .then(function(savedUser) {
    if (savedUser && savedUser.isEnrolled()) {
      console.log('user is enrolled for ' + appUser.userName);
      console.log('saved user name', savedUser.getName());
      appUser.hfcUser = savedUser;
      // throw an error here just to skip the rest of the promise chain
      throw new Error('User already enrolled');
    }
    // User is not enrolled yet, so first perform the registration
    var registrationRequest = {
      enrollmentID: appUser.userName,
      role: 'client',
      affiliation: 'org1'  // Hard code this to org1 for now...might be a bug
    };
    debug('registration request', registrationRequest);
    return ca.register(registrationRequest, registrar);
  })
  .then(function(secret) {
    // now enroll the user with the secret
    let request = {
      enrollmentID: appUser.userName,
      enrollmentSecret: secret
    };
    return ca.enroll(request);
  })
  .then(function(enrollment) {
    debug('user enrollment ', enrollment);
    user = new User(appUser.userName, client);

    var cryptoSuite = client.newCryptoSuite({path: config.keyPath});
    user.setCryptoSuite(cryptoSuite);
    return user.setEnrollment(enrollment.key, enrollment.certificate, mspid);
  })
  .then(function() {
    user.setAffiliation('org1');  // Hard code this to org1 for now.

    debug('hfcUser set for ' + appUser.userName);
    appUser.hfcUser = user;

    return client.setUserContext(user);  // set the context to this user so that the SDK will save the user
  })
  .then(function(result) {
    console.log('User context set to ', result);
  })
  .catch(function(err) {
    retVal = false;
    return console.log('getUser error: ' + err);
  });
}

exports.newUser = newUser;
