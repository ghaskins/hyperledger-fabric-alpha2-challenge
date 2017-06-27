# jyellick/plob
This directory contains a chaincode application which provides simple permissioned blob storage.  It is based originally from the fabcar example in fabric-samples.

The chaincode exposes three functions:
1. `set <key> <blob>` Create or update a blob for a key in the state database. Updates may only be performed by the creator.
2. `delete <key>` Delete the blob for a given key from the state database. Deletion may only be performed by the creator.
3. `query <key>` Get the blob for a given key from the state database.  Queries may be done by any user.

The user which first creates a blob for a given key with `set`, that user is the only one (verified by literal identity bytes comparison) which is authorized to modify that blob via `set` or `delete`.  Once a blob has been removed via `delete` it may be `set` by any user.

## Technologies Used
* chaincode: (golang)
  * dependencies: protobuf
* client: golang command line application utilizing the [fabric-sdk-go](https://github.com/hyperledger/fabric-sdk-go)
  * INCOMPLETE

## Status

This example is only chaincode operational

### Install the chaincode
```
$ ...
```
### Instantiate the chaincode
```
$ ...
```
### Create a blob with user1
```
$ ...
```
### Update a blob with user1
```
$ ...
```
### Fail to update a blob with user2
```
$ ...
```
### Delete a blob with user1
```
$ ...
```
### Create a blob with user2
```
$ ...
```
