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

var HFC = require('fabric-client');
// var Orderer = require('fabric-client/lib/Orderer.js');
// var Peer = require('fabric-client/lib/Peer.js');
var FabricCAServices = require('fabric-ca-client/lib/FabricCAClientImpl');
var User = require('fabric-client/lib/User.js');
var utils = require('fabric-client/lib/utils.js');

var debug = require('debug')('poe');
var fs = require('fs');
var path = require('path');
var config = require('./configuration.js');
var util = require('./util.js');
var Q = require('q');

var GlobalAppUser = {};
var cred = config.cred;  // Configuration file for the test network from the fabric-sdk-node

// Create a new client.
var client = new HFC();

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var chain = client.newChain(config.channelId);
var targets = [];

var tlsOptions = {
  trustedRoots: [cred.cas[0].tls_cacerts],
  verify: false
};

debug('ca tls cert', cred.cas[0].tls_cacerts);

var cryptoSuite = client.newCryptoSuite({path: config.keyPath});
var ca = new FabricCAServices(cred.cas[0].api_url, tlsOptions, '', cryptoSuite);
var admin;
var member;
var peerList = [];

for (var i = 0; i < cred.peers.length; i++) {
  let peer = client.newPeer(
    cred.peers[i].api_url,
    {
      'request-timeout': '90000',
      pem: cred.peers[i].tls_cacerts,
      'ssl-target-name-override': cred.peers[i].common_name
    }
  );
  peerList.push(peer);
}
for (var i = 0; i < peerList.length; i++) {
  targets.push(peerList[i]);
  chain.addPeer(peerList[i]);
}

// Add orderer
var orderer = client.newOrderer(
      cred.orderers[0].api_url,
      {
        'pem': cred.orderers[0].tls_cacerts,
        'ssl-target-name-override': cred.orderers[0].common_name
      }
);
chain.addOrderer(orderer);

// Configure the KeyValStore which is used to store sensitive keys
// check that the ./tmp directory existsSync
if (!fs.existsSync('./tmp')) {
  fs.mkdirSync('./tmp');
}
if (!fs.existsSync('./tmp')) {
  throw new Error('Could not create the ./tmp directory');
}

var store;
var kvsPath = './tmp/keyValStore_' + cred.network_id;
var poeChaincode = {};
function setPoeChaincode(id) {
  poeChaincode.id = id;
}

HFC.newDefaultKeyValueStore({
  path: kvsPath
})
.then(function(result) {
  debug('the store is...', result);
  store = result;
  client.setStateStore(store);
  return store.getValue('chaincodeID.poe');  // Get the shared POE chaincode ID
})
.then(function(value) {
  if (value) {
    debug('POE chaincode ID is ', value);
    try {
      poeChaincode.id = JSON.parse(value);
    } catch (e) {
      debug('error parsing poe chaincode id from file', e);
    }
  }

  // Register and enroll the redefined admin user cred.cas[0].users_clients[0].enrollId pw 'adminpw'
  return client.getUserContext(cred.cas[0].users_clients[0].enrollId, true);
})
.then(function(user) {
  if (user && user.isEnrolled()) {
    debug('The admin is already enrolled');
    member = user;
    return null;
  }
  // Go through the enrollment steps
  // 1. ca.enroll, 2. setEnrollment, 3. setUserContext
  let request = {
    enrollmentID: cred.cas[0].users_clients[0].enrollId,
    enrollmentSecret: cred.cas[0].users_clients[0].enrollSecret
  };
  debug('Requesting admin enrollment for', request);
  return ca.enroll(request);
})
.then(function(enrollment) {
  if (enrollment) {
    member = new User(cred.cas[0].users_clients[0].enrollId, client);

    member.setCryptoSuite(cryptoSuite);
    return member.setEnrollment(enrollment.key, enrollment.certificate, cred.cas[0].msp_id);
  } else {
    return null;
  }
})
.then(function() {
  // Successfully enrolled admin now set the affiliation
  // check if the affiliation is set
  let adminAffil = member.getAffiliation();
  debug('The admin affiliation is ', adminAffil);
  if (!adminAffil) {
    member.setAffiliation(cred.cas[0].users_clients[0].affiliation);  //this might be a bad idea
  }

  return client.setUserContext(member);
})
.then(function() {
  exports.admin = member;

  return store.getValue('appUsers');
})
.then(function(value) {
  var retVal = true;
  var users;
  let promises = [];

  if (value) {
    try {
      users = JSON.parse(value);
    } catch (e) {
      debug('Error in appUsers file');
      users = [];
    }
    users.forEach(function(appUser) {
      promises.push(util.newUser(appUser));
      GlobalAppUser[appUser.userName] = appUser;
    });
  }

  return Q.all(promises);
})
.then(function(results) {
  debug('Finished initializing users');
  debug(results);

  return client.setUserContext(member);
})
.then(function() {

  debug('Channel information ---------------------');
  let promises = [];
  targets.forEach(function(target) {
    promises.push(client.queryChannels(target));
  });
  return Q.all(promises);
})
.then(function(results) {
  debug('query channel response');
  results.forEach(function(result) {
    debug(result);
  });
  debug('-----------------------------------------');

  debug('calling chain initialize');
  return chain.initialize();
})
.then(function(result) {
  debug('initialize success', result);

  return client.getUserContext('peerorg1Admin', true);
})
.then(function(user) {
  if (user && user.isEnrolled()) {
    debug('getting Installed Chaincodes');
    return client.queryInstalledChaincodes(targets[0]);
  }
  return Q.resolve('peerorg1Admin not available to query Installed Chaincodes');
})
.then(function(result) {
  debug('queryInstalledChaincodes results');
  debug(result);
})
.catch(function(err) {
  debug('Failed registration or initialization', err);
});

exports.chain = chain;
exports.GlobalAppUser = GlobalAppUser;
exports.poeChaincode = poeChaincode;
exports.setPoeChaincode = setPoeChaincode;
exports.store = store;
exports.client = client;
// exports.admin = admin;
exports.cred = cred;
exports.ca = ca;
