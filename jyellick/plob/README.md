# jyellick/plob
This directory contains a chaincode application which provides simple permissioned blob storage.  It is based originally from the fabcar example in fabric-samples.

The chaincode exposes three functions:
1. `set <key> <blob>` Create or update a blob for a key in the state database. Updates may only be performed by the creator.
2. `delete <key>` Delete the blob for a given key from the state database. Deletion may only be performed by the creator.
3. `query <key>` Get the blob for a given key from the state database.  Queries may be done by any user.

The user which first creates a blob for a given key with `set`, that user is the only one (verified by literal identity bytes comparison) which is authorized to modify that blob via `set` or `delete`.  Once a blob has been removed via `delete` it may be `set` by any user.

## Technologies Used
* chaincode: (golang)
* client: golang command line application utilizing the [fabric-sdk-go](https://github.com/hyperledger/fabric-sdk-go)
* `byfn.sh` script for bootstrapping the network from [fabric-samples](https://github.com/hyperledger/fabric-samples/first-network)

## Status

This example is fully operational. It of course does however have some limitations.

1. None of the block event structure is utiltized.  This means that on instantiate, set, and delete, the client returns after the transaction has been sent to ordering, not after the block is delivered.
2. The channel name, chaincode name, etc. is all statically defined as constants.  These could be handled via command line flags, but seemed outside the scope of this exercise.

## Bootstrapping

Use the `byfn.sh` from [fabric-samples](https://github.com/hyperledger/fabric-samples/first-network) to bootstrap the network.  The steps below rely on the crypto material generated there, as well as the channel `mychannel` being created.

If you wish to use a different fabric environment, then adjust the `fabric-sdk-go_config.yaml` file and the constants defined inside of `main.go`.

To use the client, simply change dir to the client directory, and run `go build`.  You may get a full usage of the client via:

```
./client --help
2017-06-29 14:13:09.572 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 14:13:09.572 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
14:13:09.572 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
14:13:09.572 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
14:13:09.572 [bccsp_sw] DEBU :  KeyStore created at [keystore].
14:13:09.572 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
14:13:09.572 [bccsp] DEBU :  Initialize BCCSP [SW]
usage: client --user=USER [<flags>] <command> [<args> ...]

A command-line interface to the plob (permissioned blob) chaincode application.

Flags:
      --help       Show context-sensitive help (also try --help-long and --help-man).
  -u, --user=USER  User context to run the client in, for instance, org1.Admin, or org2.User

Commands:
  help [<command>...]
    Show help.

  install
    Install the chaincode to the peers defined in fabric-sdk-go_config.yaml

  instantiate
    Instantiate the chaincode on channel mychannel

  query <key>
    Query the chaincode blob

  delete <key>
    Delete the chaincode blob

  set <key> <blob>
    Set a permissioned blob
```

### Install the chaincode
```
$ ./client -u org1.Admin install
2017-06-29 13:55:49.803 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 13:55:49.803 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
13:55:49.803 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
13:55:49.803 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
13:55:49.803 [bccsp_sw] DEBU :  KeyStore created at [keystore].
13:55:49.803 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
13:55:49.803 [bccsp] DEBU :  Initialize BCCSP [SW]

=============================================
  Chaincode successfully installed
=============================================
```


### Instantiate the chaincode
```
$ ./client -u org1.Admin instantiate

2017-06-29 13:56:06.003 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 13:56:06.003 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
13:56:06.003 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
13:56:06.004 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
13:56:06.004 [bccsp_sw] DEBU :  KeyStore created at [keystore].
13:56:06.004 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
13:56:06.004 [bccsp] DEBU :  Initialize BCCSP [SW]
13:56:06.022 [fabric_sdk_go] INFO :  Constructed channel instance: &{mychannel true map[] 0 map[] 0xc420240640 <nil> 0xc42024f810 []}

=============================================
  Instantiation successfully sent
=============================================
```


### Create a blob with org1 user
```
$ ./client -u org1.User set foo bar1
2017-06-29 13:56:49.592 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 13:56:49.593 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
13:56:49.593 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
13:56:49.593 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
13:56:49.593 [bccsp_sw] DEBU :  KeyStore created at [keystore].
13:56:49.593 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
13:56:49.593 [bccsp] DEBU :  Initialize BCCSP [SW]
13:56:49.608 [fabric_sdk_go] INFO :  Constructed channel instance: &{mychannel true map[] 0 map[] 0xc42001d8b0 <nil> 0xc4202fc040 []}
=============================================
  Transaction successfully broadcast
=============================================
```

### Query a blob with org1 user
```
$ ./client -u org1.User query foo
2017-06-29 13:57:40.392 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 13:57:40.392 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
13:57:40.392 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
13:57:40.392 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
13:57:40.392 [bccsp_sw] DEBU :  KeyStore created at [keystore].
13:57:40.392 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
13:57:40.392 [bccsp] DEBU :  Initialize BCCSP [SW]
13:57:40.407 [fabric_sdk_go] INFO :  Constructed channel instance: &{mychannel true map[] 0 map[] 0xc420011ae0 <nil> 0xc4202ee1e0 []}

=============================================
  Query result is: 'bar1'
=============================================
```


### Update a blob with org1 user
```
$ ./client -u org1.User set foo bar2
2017-06-29 13:58:14.198 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 13:58:14.199 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
13:58:14.199 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
13:58:14.199 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
13:58:14.199 [bccsp_sw] DEBU :  KeyStore created at [keystore].
13:58:14.199 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
13:58:14.199 [bccsp] DEBU :  Initialize BCCSP [SW]
13:58:14.214 [fabric_sdk_go] INFO :  Constructed channel instance: &{mychannel true map[] 0 map[] 0xc42023e820 <nil> 0xc420251b00 []}

=============================================
  Transaction successfully broadcast
=============================================
```


### Fail to update a blob with org1 Admin
```
$ ./client -u org1.Admin set foo other
2017-06-29 13:59:33.476 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 13:59:33.476 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
13:59:33.476 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
13:59:33.476 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
13:59:33.476 [bccsp_sw] DEBU :  KeyStore created at [keystore].
13:59:33.476 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
13:59:33.476 [bccsp] DEBU :  Initialize BCCSP [SW]
13:59:33.493 [fabric_sdk_go] INFO :  Constructed channel instance: &{mychannel true map[] 0 map[] 0xc420246410 <nil> 0xc420251790 []}

=============================================
  Cannot set blob: invoke Endorser localhost:7051 return error: Error calling endorser 'localhost:7051':  rpc error: code = Unknown desc = chaincode error (status: 500, message: Not authorized to modify key foo)
=============================================
```


### Delete a blob with org1 user
```
$ ./client -u org1.User delete foo
2017-06-29 14:00:12.315 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 14:00:12.315 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
14:00:12.315 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
14:00:12.315 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
14:00:12.315 [bccsp_sw] DEBU :  KeyStore created at [keystore].
14:00:12.315 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
14:00:12.315 [bccsp] DEBU :  Initialize BCCSP [SW]
14:00:12.333 [fabric_sdk_go] INFO :  Constructed channel instance: &{mychannel true map[] 0 map[] 0xc42011f6d0 <nil> 0xc420274fb0 []}

=============================================
  Transaction successfully broadcast
=============================================
```


### Create a blob with org1 Admin
```
$ ./client -u org1.Admin set foo other
2017-06-29 14:00:37.155 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 001 Using config file: fabric-sdk-go_config.yaml
2017-06-29 14:00:37.155 EDT [fabric_sdk_go] InitConfigWithCmdRoot -> INFO 002 fabric_sdk_go Logging level: info
14:00:37.155 [bccsp_sw] DEBU :  KeyStore path [keystore] missing [true]: [<clean>]
14:00:37.155 [bccsp_sw] DEBU :  Creating KeyStore at [keystore]...
14:00:37.155 [bccsp_sw] DEBU :  KeyStore created at [keystore].
14:00:37.155 [bccsp_sw] DEBU :  KeyStore opened at [keystore]...done
14:00:37.155 [bccsp] DEBU :  Initialize BCCSP [SW]
14:00:37.170 [fabric_sdk_go] INFO :  Constructed channel instance: &{mychannel true map[] 0 map[] 0xc420250640 <nil> 0xc42025d7c0 []}

=============================================
  Transaction successfully broadcast
=============================================
```
