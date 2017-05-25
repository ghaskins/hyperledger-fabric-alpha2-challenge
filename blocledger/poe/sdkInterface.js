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

var path = require('path');
var fs = require('fs');
var util = require('./util.js');
var Q = require('q');
var debug = require('debug')('poe');
var config = require('./configuration.js');
var init = require('./initialize.js');
var utils = require('fabric-client/lib/utils.js');
var hfc = require('fabric-client');
var EventHub = require('fabric-client/lib/EventHub.js');

// sdk retry delay.  The number of  milliseconds to wait between rety attempts
var retryDelay = 1000;

var chaincodePath = 'github.com/chaincode/';

// Deploy function for v0.6 fabric
function deploy(req, res) {

  var ccVersion = 'v1.0.0';
  var ccName = 'poe' + '-' + Math.floor(Math.random() * 1000);
  var deployUser;
  var client = init.client;
  var chain = init.chain;
  var cred = init.cred;
  var targets = chain.getPeers();
  var store = client.getStateStore();
  debug('primary peer is ', chain.getPrimaryPeer());

  client.getUserContext('peerorg1Admin', true)
  .then(function(user) {
    deployUser = user;
    debug('set the client user context');
    debug(user);

    let nonce = utils.getNonce();
    let txId = hfc.buildTransactionID(nonce, deployUser);

    // send proposal to endorser
    let request = {
      targets: targets,
      chaincodePath: chaincodePath,
      chaincodeId: ccName,
      chaincodeVersion: ccVersion,
      txId: txId,
      nonce: nonce
    };
    debug('install chaincode request');
    debug(request);

    return client.installChaincode(request);
  })
  .then(function(results) {
    let proposalResponses = results[0];
    let proposal = results[1];
    let header   = results[2];
    debug('====== sendInstallProposal results ===========');
    debug(proposalResponses);
    for (var i = 0; i < proposalResponses.length; i++) {
      if (proposalResponses[i] instanceof Error) {
        debug('===== Error received ======');
        debug(proposalResponses[i]);
        return Q.reject(proposalResponses[i]);
      }
    }

    return chain.initialize();
  })
  .then(function(results) {
    console.log('chain initialize result ', results);

    let nonce = utils.getNonce();
    let txId = hfc.buildTransactionID(nonce, deployUser);

    // send proposal to endorser
    let request = {
      targets: targets,
      chaincodePath: chaincodePath,
      chaincodeId: ccName,
      chaincodeVersion: ccVersion,
      fcn: 'init',
      args: [],
      chainId: config.channelId,
      txId: txId,
      nonce: nonce
    };
    debug('====== Instantiate Proposal request ===========');
    debug(request);
    return chain.sendInstantiateProposal(request);
  })
  .then(function(results) {
    let proposalResponses = results[0];
    let proposal = results[1];
    let header   = results[2];
    debug('====== sendInstantiateProposal results ==========');
    debug(proposalResponses);
    debug('------- proposal ---------');
    debug(proposal);
    debug('------- header ---------');
    debug(header);

    let request = {
      proposalResponses: proposalResponses,
      proposal: proposal,
      header: header
    };
    return chain.sendTransaction(request);
  })
  .then(function(results) {
    debug('====== sendTransaction results ===========');
    debug(results);

    let ccID = {
      chaincodeId: ccName,
      chaincodeVersion: ccVersion
    };
    let storeName = 'chaincodeID.' + 'poe';
    init.setPoeChaincode(ccID);
    store.setValue(storeName, JSON.stringify(ccID))
    .then(function(value) {
      console.log('chaincode id stored', value);
    }, function(err) {
      console.log('error saving chaincodeid. ' + err);
    });

    res.json(results);
  })
  .catch(function(err) {
    console.log('deploy failed: ', err);
    res.status(500).json(err);
  });
  return;
}

// create a promise for the chaincode Invoke so it can be easily retried
function sdkInvoke(user, invokeRequest) {
  var client = init.client;
  var chain = init.chain;
  var cred = init.cred;
  var eventhub;
  var ehtxid;
  var targets = chain.getPeers();
  var store = client.getStateStore();
  debug(invokeRequest);

  return client.setUserContext(user, true)
  .then(function(user) {

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

    let nonce = utils.getNonce();
    let txId = hfc.buildTransactionID(nonce, user);
    ehtxid = txId.toString();
    // debug('the user context is ', client.getUserContext());
    let ccID = {};
    debug(invokeRequest);
    ccID = invokeRequest.chaincodeID;

    let request = {
      chaincodeId: ccID.chaincodeId,
      chaincodeVersion: ccID.chaincodeVersion,
      fcn: invokeRequest.fcn,
      args: invokeRequest.args,
      chainId: config.channelId,
      txId: txId,
      nonce: nonce
    };
    debug(request);
    return chain.sendTransactionProposal(request);
  })
  .then(function(results) {
    let proposalResponses = results[0];
    let proposal = results[1];
    let header   = results[2];
    debug('====== sendTransactionProposal results ==========');
    debug(proposalResponses);

    for (var i = 0; i < proposalResponses.length; i++) {
      if (proposalResponses[i] instanceof Error) {
        debug('===== Error received ======');
        debug(proposalResponses[i]);
        return Q.reject(proposalResponses[i]);
      }
    }

    let ehPromise = new Promise(function(resolve, reject) {
      let handle = setTimeout(function() {
        if (!config.windows) {eventhub.unregisterTxEvent(ehtxid);}
        reject(new Error('Event hub timed out.'));
      }, 30000);
      debug('registering for the Tx event');

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

    let request = {
      proposalResponses: proposalResponses,
      proposal: proposal,
      header: header
    };
    debug('======  sending transaction  =========');
    return Q.allSettled([chain.sendTransaction(request), ehPromise]);
  })
  .then(function(results) {
    debug('====== sendTransaction results ===========');
    debug(results);
    for (let i = 0; i < results.length; i++) {
      if (results[i].state == 'rejected') {
        return Q.reject(results[i].reason);
      }
    }
    if (!config.windows) {eventhub.disconnect();}
    return Q.resolve(results);
  })
  .catch(function(err) {
    debug('====== invoke failed ===========');
    debug(err);
    if (!config.windows) {eventhub.disconnect();}
    return Q.reject(err);
  });
}

//wrap the sdkInvoke promises in retry logic
function retrySdkInvoke(user, invokeRequest, maxRetries) {
  return sdkInvoke(user, invokeRequest)
  .then(function(results) {
    return results;
  }, function(err) {
    debug(err);
    debug('sdkInvoke error, retries left ' + maxRetries);
    if (maxRetries > 0) {
      return Q.delay(retryDelay)
      .then(function() {
        return retrySdkInvoke(user, invokeRequest, maxRetries - 1);
      });
    }
    return Q.reject(err);
  });
}

// create a promise for the chaincode query so it can be easily retried
function sdkQuery(user, queryRequest, maxRetries) {
  var client = init.client;
  var chain = init.chain;
  var target = chain.getPrimaryPeer();
  var store = client.getStateStore();

  return client.setUserContext(user, true)
  .then(function(user) {

    let nonce = utils.getNonce();
    let txId = hfc.buildTransactionID(nonce, user);
    let ccID = {};

    ccID = queryRequest.chaincodeID;

    let request = {
      targets: target,
      chaincodeId: ccID.chaincodeId,
      chaincodeVersion: ccID.chaincodeVersion,
      fcn: queryRequest.fcn,
      args: queryRequest.args,
      chainId: config.channelId,
      txId: txId,
      nonce: nonce
    };
    debug(request);
    return chain.queryByChaincode(request);
  })
  .then(function(results) {
    debug('====== queryByChaincode results ==========');
    for (var i = 0; i < results.length; i++) {
      debug(results[i]);
    }
    return Q.resolve(results);
  })
  .catch(function(err) {
    debug('====== query failed ===========');
    debug(err);
    return Q.reject(err);
  });
}

//wrap the sdkQuery promises in retry logic
function retrySdkQuery(user, queryRequest, maxRetries) {
  return sdkQuery(user, queryRequest)
  .then(function(results) {
    return results;
  }, function(err) {
    debug(err);
    debug('sdkQuery error, retries left ' + maxRetries);
    if (maxRetries > 0) {
      return Q.delay(retryDelay)
      .then(function() {
        return retrySdkQuery(user, queryRequest, maxRetries - 1);
      });
    }
    return Q.reject(err);
  });
}

exports.retrySdkInvoke = retrySdkInvoke;
exports.retrySdkQuery = retrySdkQuery;
exports.deploy = deploy;
