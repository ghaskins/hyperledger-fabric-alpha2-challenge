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

package main


import (
	"encoding/json"
	"fmt"
	"errors"
	"strings"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type Time struct {
	Seconds int64
	Nanos	int32
}


type poe struct {
	Name string
	Hash string
	Version string
	Owner string
	hashType string
	TxID string
	Date Time
}

var chaincodeLogger = shim.NewLogger("poe")

// SimpleChaincode example simple Chaincode implementation
type SimpleChaincode struct {
}


func printAsHex(buf []byte, ct int) {
	var i int

	for i = 0; i + 8 < ct; i += 8 {
 		poeLogger(debugLevel, "0x%2.2X 0x%2.2X 0x%2.2X 0x%2.2X 0x%2.2X 0x%2.2X 0x%2.2X 0x%2.2X\n", buf[i], buf[i+1], buf[i+2], buf[i+3], buf[i+4], buf[i+5], buf[i+6], buf[i+7]);
	}
	if i < ct {
                for ; i < ct; i++ {
                        poeLogger(debugLevel, "0x%2.2X ", buf[i]);
                }
                poeLogger(debugLevel, "\n");
        }
}

const criticalLevel = shim.LogCritical
const errorLevel = shim.LogError
const warningLevel = shim.LogWarning
const noticeLevel = shim.LogNotice
const infoLevel = shim.LogInfo
const debugLevel = shim.LogDebug

func poeLogger(level shim.LoggingLevel, format string, args ...interface{}) {
    	switch level {
	case criticalLevel:
	  chaincodeLogger.Criticalf(format, args...)
	case errorLevel:
	  chaincodeLogger.Errorf(format, args...)
	case warningLevel:
	  chaincodeLogger.Warningf(format, args...)
	case noticeLevel:
	  chaincodeLogger.Noticef(format, args...)
	case infoLevel:
	  chaincodeLogger.Infof(format, args...)
	case debugLevel:
	  chaincodeLogger.Debugf(format, args...)
	}
}


func poeDebugLogger(format string, args ...interface{}) {
	poeLogger(debugLevel, format, args ...)
}


// args[0] == "SETLOGLEVEL"
// args[1] == [ "CRITICAL", "ERROR", "WARNING", "NOTICE", "INFO", "DEBUG"]

func (t *SimpleChaincode) Init(stub shim.ChaincodeStubInterface) pb.Response {
	_ , args := stub.GetFunctionAndParameters()

	if len(args) >= 2 && strings.ToUpper(args[0]) == "SETLOGLEVEL" {
                level, err := shim.LogLevel(args[1])
                if err == nil {
			shim.SetLoggingLevel(level)
                        chaincodeLogger.SetLevel(level)
                }
        }
	poeLogger(infoLevel, "Init completed\n")
	return shim.Success(nil)
}

func  (t *SimpleChaincode) addDoc(stub shim.ChaincodeStubInterface, key string, arg string) ([]byte, error) {
	var err error
	var proof poe

	poeLogger(infoLevel, "addDoc: key = %s  arg = %s\n", key, arg)
	value , err := stub.GetState(key)
	if value != nil {
		jsonResp := "{\"Error\":\"File already exists for key: " + key + "\"}"
		poeLogger(errorLevel, "Error: File already exists for key: %s", key)
		return nil, errors.New(jsonResp)
	}
	err = json.Unmarshal([]byte(arg), &proof)
	if err != nil {
		poeLogger(errorLevel, "addDoc: Can NOT Unmarshal arg")
		return nil, errors.New("addDoc: Can NOT Unmarshal arg")
	}
	proof.Version = "1.0"
	proof.Hash = key;
	proof.TxID = stub.GetTxID()
	myTime , err := stub.GetTxTimestamp()
	if err != nil {
		poeLogger(errorLevel, "addDoc: Can NOT GetTxTimestamp")
		return nil, errors.New("addDoc: Can NOT GetTxTimestamp")
	}
	if myTime != nil {
		proof.Date.Seconds = myTime.Seconds
		proof.Date.Nanos = myTime.Nanos
	}
	b, err := json.Marshal(proof)
	if err != nil {
		poeLogger(errorLevel, "addDoc: Can NOT Marshal arg")
		return nil, errors.New("addDoc: Can NOT Marshal arg")
	}

	// Write the state to the ledger
	err = stub.PutState(key, b)
	if err != nil {
		poeLogger(errorLevel, "%s", err)
		return nil, err
	}
	return nil, nil
}

func  (t *SimpleChaincode) transferDoc(stub shim.ChaincodeStubInterface, key string, arg string) ([]byte, error) {
	var err error
	var proof poe

	poeLogger(infoLevel, "transferDoc: key = %s newowner = %s\n", key, arg)
	value, err := stub.GetState(key)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get state for " + key + "\"}"
		poeLogger(errorLevel, "Error: Failed to get state for key: %s", key)
		return nil, errors.New(jsonResp)
	}
	err = json.Unmarshal(value, &proof)
	if err != nil {
		poeLogger(errorLevel, "addDoc: Can NOT unMarshal arg")
		return nil, errors.New("addDoc: Can NOT unMarshal arg")
	}
	proof.Owner = arg
	b, err := json.Marshal(proof)
	if err != nil {
		poeLogger(errorLevel, "addDoc: Can NOT Marshal arg")
		return nil, errors.New("addDoc: Can NOT Marshal arg")
	}
	chaincodeLogger.Debugf("addDoc: arg after Marshal: %s\n", b)

	// Write the state to the ledger
	err = stub.PutState(key, b)
	if err != nil {
		poeLogger(errorLevel, "%s", err)
		return nil, err
	}
	return nil, nil
}

func  (t *SimpleChaincode) readDoc(stub shim.ChaincodeStubInterface, key string) ([]byte, error) {
	var err error

	poeLogger(infoLevel, "readDoc: key = %s\n", key)
	value, err := stub.GetState(key)
	if err != nil {
		jsonResp := "{\"Error\":\"Failed to get state for " + key + "\"}"
		poeLogger(errorLevel, "Error: Failed to get state for key: %s", key)
		return nil, errors.New(jsonResp)
	}
	if value == nil {
		value = []byte("{\"Error\":\"Document not found\"}")
	}
	return value, nil
}

func (t *SimpleChaincode) listDoc(stub shim.ChaincodeStubInterface) ([]byte, error) {
	keysIter, err := stub.GetStateByRange("", "")
	if err != nil {
		poeLogger(errorLevel, "keys operation failed. Error accessing state: %s", err)
		return nil, fmt.Errorf("keys operation failed. Error accessing state: %s", err)
	}
	defer keysIter.Close()
	keys := map[string]string{}
	for keysIter.HasNext() {
		key, iterErr := keysIter.Next()
		if iterErr != nil {
			poeLogger(errorLevel, "keys operation failed. Error accessing state: %s", err)
			return nil, fmt.Errorf("keys operation failed. Error accessing state: %s", err)
		}
		value, err := stub.GetState(key.Key)
		if err != nil {
			jsonResp := "{\"Error\":\"Failed to get state for " + key.Key + "\"}"
			poeLogger(errorLevel, "Error: Failed to get state for key: %s", key.Key)
			return nil, errors.New(jsonResp)
		}
		if value == nil {
			jsonResp := "{\"Error\":\"Nil amount for " + key.Key + "\"}"
			poeLogger(errorLevel, "Error: Nil value for key: %s", key.Key)
			return nil, errors.New(jsonResp)
		}
		keys[key.Key] = string(value)
	}
	jsonKeys, err := json.Marshal(keys)
	if err != nil {
		poeLogger(errorLevel, "keys operation failed. Error marshaling JSON: %s", err)
		return nil, fmt.Errorf("keys operation failed. Error marshaling JSON: %s", err)
	}
	return jsonKeys, nil
}

func (t *SimpleChaincode) delDoc(stub shim.ChaincodeStubInterface, key string) ([]byte, error) {
	poeLogger(infoLevel, "delDoc: key = %s\n", key)
	err := stub.DelState(key)
	if err != nil {
		poeLogger(errorLevel, "delDoc:Failed to delete state")
		return nil, errors.New("delDoc:Failed to delete state")
	}
	return nil, nil
}

func (t *SimpleChaincode) retByteArray(stub shim.ChaincodeStubInterface) (retCode []byte) {
        return nil
}

func (t *SimpleChaincode) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	var err error
	errMsg := ""
	retCode := t.retByteArray(stub)

	function, args := stub.GetFunctionAndParameters()
	switch  function {
	case "setLogLevel":
		if len(args) != 1 {
			errMsg = "setLogLevel: Incorrect number of arguments for function: setLogLevel Expecting 1"
			break;
		}
		level, err := shim.LogLevel(args[0])
                if err != nil {
                        errMsg = fmt.Sprintf("setLogLevel: Bad argument for setLogLevel arg = %s", args[0])
                        break
                }
		shim.SetLoggingLevel(level)
                chaincodeLogger.SetLevel(level)
	case "addDoc":
		if len(args) != 2 {
			errMsg = "addDoc: Incorrect number of arguments: Expecting 2"
			break;
		}
		retCode , err = t.addDoc(stub, args[0], args[1])
	case "delDoc":
		if len(args) != 1 {
			errMsg = "delDoc: Incorrect number of argumentsExpecting 1"
			break;
		}
		retCode , err = t.delDoc(stub, args[0])
	case "transferDoc":
		if len(args) != 2 {
			errMsg = "transferDoc: Incorrect number of arguments: Expecting 2"
			break;
		}
		retCode , err =  t.transferDoc(stub, args[0], args[1])
	case "listDoc":
		if len(args) != 0 {
			errMsg = "listDoc: Incorrect number of arguments: Expecting 0"
			break;
		}
		retCode , err = t.listDoc(stub)
	case "readDoc":
		if len(args) != 1 {
			errMsg = "readDoc: Incorrect number of arguments: Expecting 1"
			break;
		}
		retCode , err = t.readDoc(stub, args[0])
	default:
                errMsg = fmt.Sprintf("Invoke: Unrecognized function = %s\n", function)
        }
        if errMsg != "" {
                poeLogger(errorLevel, errMsg)
                return shim.Error(errMsg)
        }
        if err == nil {
                return shim.Success(retCode)
        } else {
                return shim.Error(err.Error())
        }
}


// Query callback representing the query of a chaincode
func (t *SimpleChaincode) Query(stub shim.ChaincodeStubInterface) ([]byte, error) {
	function, args := stub.GetFunctionAndParameters()

	switch  function {
	case "listDoc":
		if len(args) != 0 {
			poeLogger(errorLevel, "listDoc: Incorrect number of arguments for function: %s  Expecting 0", function)
			return nil, errors.New("listDoc: Incorrect number of arguments. Expecting 0")
		}
		return t.listDoc(stub)
	case "readDoc":
		if len(args) != 1 {
			poeLogger(errorLevel, "readDoc: Incorrect number of arguments for function: %s  Expecting 1", function)
			return nil, errors.New("readDoc: Incorrect number of arguments. Expecting 1")
		}
		return t.readDoc(stub, args[0])
	default:
		poeLogger(errorLevel, "Invalid Query function name: %s",function)
		return nil, fmt.Errorf("Invalid Query function name: %s",function)
	}
}


func main() {
	err := shim.Start(new(SimpleChaincode))
	if err != nil {
		fmt.Printf("Error starting Simple chaincode: %s", err)
	}
}
