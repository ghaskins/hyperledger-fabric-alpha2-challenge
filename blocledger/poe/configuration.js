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

var fs = require('fs');
var path = require('path');

// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
// jscs:disable maximumLineLength

var cred;

if (process.platform === 'darwin' || process.platform === 'linux') {
  cred = require('./config-mac.json');
} else {
  cred = require('./config-win.json');
}
for (let i = 0; i < cred.peers.length; i++) {
  let data = fs.readFileSync(path.join(__dirname, cred.peers[i].tls_cacerts));
  cred.peers[i].tls_cacerts = Buffer.from(data).toString();
  cred.peers[i].common_name = cred.peers[i].name;
}
for (let i = 0; i < cred.orderers.length; i++) {
  let data = fs.readFileSync(path.join(__dirname, cred.orderers[i].tls_cacerts));
  cred.orderers[i].tls_cacerts = Buffer.from(data).toString();
  cred.orderers[i].common_name = cred.orderers[i].name;
}
for (let i = 0; i < cred.cas.length; i++) {
  let data = fs.readFileSync(path.join(__dirname, cred.cas[i].tls_cacerts));
  cred.cas[i].tls_cacerts = Buffer.from(data).toString();
  cred.cas[i].common_name = cred.cas[i].name;
}

var networkId = cred.network_id;
var channelId = 'mychannel';

exports.cred = cred;
exports.networkId = networkId;
exports.channelId = channelId;
exports.keyPath = path.join(__dirname, '/tmp/keyValStore_' + networkId, 'keys');

// sdk retry count.  The number of times repeat the SDK query or invoke before failing.
exports.retryCount = 1;

var windows = false;
if (process.platform.indexOf('win') === 0) {
  windows = true;
}
exports.windows = windows;
