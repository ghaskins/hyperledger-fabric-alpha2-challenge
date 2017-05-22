# ghaskins/example02
This directory contains a chaincode application inspired by "example02" found in the [fabric.git](https://github.com/hyperledger/fabric/tree/master/examples/chaincode/go/chaincode_example02) repository.

## Technologies Used
* chaincode: [chaintool](https://github.com/hyperledger/fabric-chaintool) based golang
* client: clojurescript command line application utilizing the [fabric-sdk-node](https://github.com/hyperledger/fabric-sdk-node)

## Status

This example is fully operational

## Prerequisites
* GNU make
* java JRE v1.8 or newer
* nodejs v6.x
* chaintool

### chaintool

Install the [latest version](https://github.com/hyperledger/fabric-chaintool/releases/download/v0.10.3/chaintool) of [chaintool](http://fabric-chaintool.readthedocs.io/en/latest/) somewhere in your $PATH
```
$ wget https://github.com/hyperledger/fabric-chaintool/releases/download/v0.10.3/chaintool
$ chmod +x chaintool
```
## Instructions
You will need access to a fabric network complete with peers and orderers already running and a channel in which your client is authorized to create and manipulate chaincode instances.  It is beyond the scope of this example to demonstrate how to do this, but one suggestion is to use the fabric.git/examples/cluster facility.

### Compile the client
```
$ cd client && make
/usr/local/bin/lein nodecompile
[npm] Installing Dependencies
[nodecljs] Compiling
Compilation complete: use "node target/nodecljs/main.js --help" for execution instructions
```

### Test the client
```
$ node target/nodecljs/main.js --help
info: Returning a new winston logger with default configurations
Usage: example02 [options]

Options Summary:
      --config CONFIG    client.config  path/to/client.config
  -p, --path ID                         path/to/chaincode.car ('install' only)
  -i, --id ID            mycc           ChaincodeID
  -v, --version VERSION  1              Chaincode version
      --channel ID       mychannel      Channel ID
  -c, --command CMD      check-balance  One of [install instantiate make-payment delete-account check-balance]
  -a, --args ARGS                       JSON formatted arguments to submit
  -h, --help
```

### Create a Chaincode-Archive (CAR) package
This will prepare the chaincode application for deployment to the fabric network
```
$ chaintool package -p ../chaincode/ -o chaincode.car
Writing CAR to: /home/ghaskins/sandbox/git/hyperledger-fabric-alpha2-challenge/ghaskins/example02/client/chaincode.car
Using path ../chaincode/ ["src" "chaincode.yaml"]
|------+------------------------------------------+--------------------------------------------------------|
| Size |                   SHA1                   |                          Path                          |
|------+------------------------------------------+--------------------------------------------------------|
| 438  | d28b22c7c30506af926dcb5bc8b946ac35ddac7f | chaincode.yaml                                         |
| 3904 | 71d7b7253158c006d2b619e192fd04812e812514 | src/chaincode/chaincode_example02.go                   |
| 143  | 7305f65e18e4aab860b201d40916bb7adf97544f | src/interfaces/appinit.cci                             |
| 360  | 5000028a491f27946e76f0ec4dfd05a293223fad | src/interfaces/org.hyperledger.chaincode.example02.cci |
|------+------------------------------------------+--------------------------------------------------------|
Platform:            org.hyperledger.chaincode.golang version 1
Digital Signature:   none
Raw Data Size:       4845 bytes
Archive Size:        2366 bytes
Compression Alg:     gzip
Chaincode SHA3:      1f23c4ab60c1e47d9efb3728e5d3f2922cf7d79fdce359281b26d72f979ad223c8bea18366fc92bd08eca0ee9e7db9a57899560b8cffa4267eae3e34cf5ac48f
```
### Install the chaincode
```
$ node target/nodecljs/main.js --config ~/sandbox/hyperledger/go/src/github.com/hyperledger/fabric/examples/cluster/build/client.config -c install -p chaincode.car -v1
info: Returning a new winston logger with default configurations
info: [Client.js]: loading user from files
info: [crypto_ecdsa_aes]: This class requires a CryptoKeyStore to save keys, using the store: {"opts":{"path":"/home/ghaskins/.hfc-key-store"}}
Running install(null)
info: [packager/Car.js]: Packaging CAR file from chaincode.car
Success!
```
### Instantiate the chaincode
```
$ node target/nodecljs/main.js --config ~/sandbox/hyperledger/go/src/github.com/hyperledger/fabric/examples/cluster/build/client.config -c instantiate -v1
info: Returning a new winston logger with default configurations
info: [Client.js]: loading user from files
info: [crypto_ecdsa_aes]: This class requires a CryptoKeyStore to save keys, using the store: {"opts":{"path":"/home/ghaskins/.hfc-key-store"}}
Running instantiate({"partyA":{"entity":"A","value":100},"partyB":{"entity":"B","value":200}})
Success!
```
### Check Initial Balances
```
$ node target/nodecljs/main.js --config ~/sandbox/hyperledger/go/src/github.com/hyperledger/fabric/examples/cluster/build/client.config -c check-balance '{"id":"A"}'
info: Returning a new winston logger with default configurations
info: [Client.js]: loading user from files
info: [crypto_ecdsa_aes]: This class requires a CryptoKeyStore to save keys, using the store: {"opts":{"path":"/home/ghaskins/.hfc-key-store"}}
Running check-balance({"id":"A"})
Success: Balance = 100
```
```
$ node target/nodecljs/main.js --config ~/sandbox/hyperledger/go/src/github.com/hyperledger/fabric/examples/cluster/build/client.config -c check-balance '{"id":"B"}'
info: Returning a new winston logger with default configurations
info: [Client.js]: loading user from files
info: [crypto_ecdsa_aes]: This class requires a CryptoKeyStore to save keys, using the store: {"opts":{"path":"/home/ghaskins/.hfc-key-store"}}
Running check-balance({"id":"B"})
Success: Balance = 200
```
### Make a payment from A to B
```
$ node target/nodecljs/main.js --config ~/sandbox/hyperledger/go/src/github.com/hyperledger/fabric/examples/cluster/build/client.config -c make-payment
info: Returning a new winston logger with default configurations
info: [Client.js]: loading user from files
info: [crypto_ecdsa_aes]: This class requires a CryptoKeyStore to save keys, using the store: {"opts":{"path":"/home/ghaskins/.hfc-key-store"}}
Running make-payment({"partySrc":"A","partyDst":"B","amount":10})
Success!
```
### Reconfirm Balances
```
$ node target/nodecljs/main.js --config ~/sandbox/hyperledger/go/src/github.com/hyperledger/fabric/examples/cluster/build/client.config -c check-balance '{"id":"A"}'
info: Returning a new winston logger with default configurations
info: [Client.js]: loading user from files
info: [crypto_ecdsa_aes]: This class requires a CryptoKeyStore to save keys, using the store: {"opts":{"path":"/home/ghaskins/.hfc-key-store"}}
Running check-balance({"id":"A"})
Success: Balance = 90
```
```
$ node target/nodecljs/main.js --config ~/sandbox/hyperledger/go/src/github.com/hyperledger/fabric/examples/cluster/build/client.config -c check-balance '{"id":"B"}'
info: Returning a new winston logger with default configurations
info: [Client.js]: loading user from files
info: [crypto_ecdsa_aes]: This class requires a CryptoKeyStore to save keys, using the store: {"opts":{"path":"/home/ghaskins/.hfc-key-store"}}
Running check-balance({"id":"B"})
Success: Balance = 210
```
