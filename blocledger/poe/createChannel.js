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
var Q = require('q');

var GlobalAppUser = {};
var config = require('./configuration.js');
var cred = config.cred;   // Configuration file for the test network from the fabric-sdk-node

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var client = new HFC();  // Create a new client.
var EventHub = require('fabric-client/lib/EventHub.js');

var tlsOptions = {
  trustedRoots: [cred.cas[0].tls_cacerts],
  verify: false
};
debug(tlsOptions);

let opts = {path: config.keyPath};
debug(opts);

debug('=============================================================');
var cryptoSuite = client.newCryptoSuite(opts);
debug(cryptoSuite);
debug('=============================================================');
var ca = new FabricCAServices(cred.cas[0].api_url, tlsOptions, '', cryptoSuite);  // Create a new CA
var targets = [];
var chain = {};
var eventhub;
var ehtxid;

// Add orderer
// var caRootsPath = cred.orderers[0].tls_cacerts;
// let data = fs.readFileSync(path.join(__dirname, caRootsPath));
// let caroots = Buffer.from(data).toString();

var orderer = client.newOrderer(
      cred.orderers[0].api_url,
      {
        'pem': cred.orderers[0].tls_cacerts,
        'ssl-target-name-override': cred.orderers[0].common_name
      }
);
for (var i = 0; i < cred.peers.length; i++) {
  // let data = fs.readFileSync(path.join(__dirname, cred.peers[i].tls_cacerts));
  let peer = client.newPeer(
    cred.peers[i].api_url,
    {
      'request-timeout': '120000',
      pem: cred.peers[i].tls_cacerts,
      'ssl-target-name-override': cred.peers[i].common_name
    }
  );

  targets.push(peer);
}

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
var admin;
var member;
var genisisBlock;
var peerorg1Admin;

HFC.newDefaultKeyValueStore({
  path: kvsPath
})
.then(function(result) {
  debug('the store is...', result);
  store = result;
  client.setStateStore(store);

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
  debug('calling ca.enroll to enroll admin');
  let request = {
    enrollmentID: cred.cas[0].users_clients[0].enrollId,
    enrollmentSecret: cred.cas[0].users_clients[0].enrollSecret
  };
  return ca.enroll(request);
})
.then(function(enrollment) {
  if (enrollment) {
    debug('creating a new user for admin and setting the enrollment');
    member = new User(cred.cas[0].users_clients[0].enrollId, client);

    member.setCryptoSuite(cryptoSuite);
    debug('=============================================================');
    debug(member.getCryptoSuite());
    debug('=============================================================');

    return member.setEnrollment(enrollment.key, enrollment.certificate, cred.cas[0].msp_id);
  } else {
    return null;
  }
})
.then(function() {
  // Successfully enrolled admin now set the affiliation
  debug('admin affiliation is', member.getAffiliation());
  if (!member.getAffiliation()) {
    debug('setting the affiliation for admin');
    member.setAffiliation(cred.cas[0].users_clients[0].affiliation);  //this might be a bad idea
  }

  debug('set the user context to the new admin user so it gets saved');
  return client.setUserContext(member);
})
.then(function() {

  // jscs:disable maximumLineLength
  debug('create a user based on the cert for org1 admin');
  let data = fs.readFileSync(path.join(__dirname, '/test/fixtures-V1/crypto-config/peerOrganizations/org1.blocledger.com/users/Admin@org1.blocledger.com/tls/', 'server.key'));
  let keyPEM = Buffer.from(data).toString();
  data = fs.readFileSync(path.join(__dirname, '/test/fixtures-V1/crypto-config/peerOrganizations/org1.blocledger.com/users/Admin@org1.blocledger.com/tls/', 'server.crt'));
  let certPEM = Buffer.from(data).toString();
  // jscs:enable maximumLineLength

  let request = {
    username: 'peerorg1Admin',
    mspid: cred.cas[0].msp_id,
    cryptoContent: {
      privateKeyPEM: keyPEM,
      signedCertPEM: certPEM
    }
  };
  return client.createUser(request);
})
.then(function(admin) {
  debug('finished enrolling org1 admin');
  debug(admin);
  peerorg1Admin = admin;

  // read in the envelope to send to the orderer
  let data = fs.readFileSync(path.join(__dirname, './test/fixtures-V1/channel.tx'));
  var request = {
    name: 'mychannel',
    envelope: data,
    orderer: orderer
  };
  debug('new procedure for signing the config');
  var channelConfig = client.extractChannelConfig(data);
  var signature = client.signChannelConfig(channelConfig);
  var signatures = [];
  signatures.push(signature);
  signatures.push(signature);  // this second signature is from the sdk test code.  Appears to work around a problem somewhere
  let nonce = utils.getNonce();
  let txId = HFC.buildTransactionID(nonce, peerorg1Admin);
  ehtxid = txId.toString();

  // jscs:disable requireCamelCaseOrUpperCaseIdentifiers
  // set up the event hub
  debug('Connecting the event hub');
  eventhub = new EventHub(client);
  eventhub.setPeerAddr(
    cred.peers[0].event_url,
    {
      pem: cred.peers[0].tls_cacerts,
      'ssl-target-name-override': cred.peers[0].common_name
    }
  );
  eventhub.connect();
  // jscs:enable requireCamelCaseOrUpperCaseIdentifiers

  let ehPromise = new Promise(function(resolve, reject) {
    let handle = setTimeout(function() {
      if (!config.windows) {eventhub.unregisterTxEvent(ehtxid);}
      reject(new Error('Event hub timed out.'));
    }, 10000);
    debug('registering for the Tx event');

    // Setup event hug to listen for results
    eventhub.registerTxEvent(ehtxid, function(txid, code) {
      clearTimeout(handle);
      if (!config.windows) {eventhub.unregisterTxEvent(txid);}

      if (code !== 'VALID') {
        debug('Transaction failed event hub reported:', code);
        return reject(new Error('Event hub status return: ' + code));
      } else {
        debug('received a VALID status from the event hub for ', txid);
        return resolve({status: code});
      }
    });
  });

  // Create the new form for request...
  request = {
    name: 'mychannel',
    orderer: orderer,
    config: channelConfig,
    signatures: signatures,
    txId: txId,
    nonce: nonce
  };

  debug('============  calling createChannel =====================');
  return Q.allSettled([client.createChannel(request), ehPromise]);
})
.then(function(result) {
  debug('--------------------------------------------');
  debug('Channel created ', result);
  if (!config.windows) {eventhub.disconnect();}

  chain = client.newChain('mychannel');
  chain.addOrderer(orderer);

  // see if the channel has been created
  debug(chain);
  debug('chain name', chain.getName());
  debug('orderers', chain.getOrderers());

  debug('----------calling getChannelConfig after createChannel succeeded -----------');
  return chain.getChannelConfig();
}, function(err) {
  debug('Error creating channel, maybe it is already created, try building it');
  debug(err);
  if (!config.windows) {eventhub.disconnect();}

  chain = client.newChain('mychannel');
  chain.addOrderer(orderer);
  debug('----------calling getChannelConfig after createChannel fails -----------');
  return chain.getChannelConfig();
})
.then(function(result) {
  debug('channel config', result);

  // jscs:disable maximumLineLength
  debug('create a user based on the cert for the orderer admin');
  let data = fs.readFileSync(path.join(__dirname, '/test/fixtures-V1/crypto-config/ordererOrganizations/blocledger.com/users/Admin\@blocledger.com/tls/', 'server.key'));
  let keyPEM = Buffer.from(data).toString();
  data = fs.readFileSync(path.join(__dirname, '/test/fixtures-V1/crypto-config/ordererOrganizations/blocledger.com/users/Admin\@blocledger.com/tls/', 'server.crt'));
  let certPEM = Buffer.from(data).toString();
  // jscs:enable maximumLineLength

  let request = {
    username: 'ordererAdmin',
    mspid: 'OrdererMSP',
    cryptoContent: {
      privateKeyPEM: keyPEM,
      signedCertPEM: certPEM
    }
  };
  return client.createUser(request);
})
.then(function(admin) {
  debug('finished enrolling orderer admin');
  debug(admin);

  let nonce = utils.getNonce();
  let txId = HFC.buildTransactionID(nonce, admin);
  let request = {
    txId: txId,
    nonce: nonce
  };
  return chain.getGenesisBlock(request);
})
.then(function(block) {
  genisisBlock = block;

  return client.setUserContext(peerorg1Admin);
})
.then(function(user) {

  // join the peers to the channel
  debug('join the peers to the channel');
  let nonce = utils.getNonce();
  let txId = HFC.buildTransactionID(nonce, user);
  var request = {
    targets: targets,
    block: genisisBlock,
    txId: txId,
    nonce: nonce
  };
  return chain.joinChannel(request);
})
.then(function(result) {
  debug('-------- join channel results ---------');
  debug(result);
})
.catch(function(err) {
  debug('============================================');
  debug('Error creating channel ', err);
});
