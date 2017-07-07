/*
 Copyright IBM Corp. All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package main

import (
	"fmt"
	"os"
	"strings"

	bccspFactory "github.com/hyperledger/fabric/bccsp/factory"

	api "github.com/hyperledger/fabric-sdk-go/api"
	"github.com/hyperledger/fabric-sdk-go/pkg/config"
	client "github.com/hyperledger/fabric-sdk-go/pkg/fabric-client"
	"github.com/hyperledger/fabric-sdk-go/pkg/fabric-client/peer"
	"github.com/hyperledger/fabric-sdk-go/pkg/util"

	"gopkg.in/alecthomas/kingpin.v2"
)

const (
	// These constants could/should all be set through config/flags, but
	// as the point of this exercise is to use the SDK, not write a fancy app
	// using constants for now
	ConfigFile  = "fabric-sdk-go_config.yaml"
	TestChannel = "mychannel"

	chaincodeID      = "plob"
	chaincodeVersion = "v0"
	chaincodePath    = "github.com/ghaskins/hyperledger-fabric-alpha2-challenge/jyellick/plob/chaincode"
)

func bigMsg(msg string) {
	fmt.Println()
	fmt.Println("=============================================")
	fmt.Println(" ", msg)
	fmt.Println("=============================================")
	fmt.Println()
}

// getPeers constructs api.Peer instances when needed outside the scope of a channel
func getPeers(client api.FabricClient) []api.Peer {
	peersConfig, err := client.GetConfig().GetPeersConfig()
	if err != nil {
		panic(err)
	}

	peers := make([]api.Peer, len(peersConfig))
	for i, pc := range peersConfig {
		peers[i], err = peer.NewPeerTLSFromCert(fmt.Sprintf("%s:%d", pc.Host, pc.Port),
			pc.TLS.Certificate, pc.TLS.ServerHostOverride, client.GetConfig())
		if err != nil {
			panic(err)
		}
	}
	return peers
}

// getChannel wraps the util.GetChannel, panic-ing if something goes wrong
func getChannel(client api.FabricClient, channelID string) api.Channel {
	channel, err := util.GetChannel(client, channelID)
	if err != nil {
		panic(err)
	}
	return channel
}

// installCC installs the chaincode to the peers in the config file
func installCC(client api.FabricClient) {
	org1Admin, err := GetAdmin(client, "org1")
	if err != nil {
		panic(fmt.Errorf("Error getting org1 admin user: %v", err))
	}

	client.SetUserContext(org1Admin)

	peers := getPeers(client)

	err = util.SendInstallCC(client, nil, chaincodeID, chaincodePath, chaincodeVersion, nil, peers, os.Getenv("GOPATH"))

	if err != nil {
		panic(err)
	}

	bigMsg("Chaincode successfully installed")
}

// instantiateCC instantiates the chaincode on TestChannel
func instantiateCC(channel api.Channel) {
	transactionProposalResponse, _, err := channel.SendInstantiateProposal(chaincodeID, TestChannel, []string{}, chaincodePath, chaincodeVersion, []api.Peer{channel.GetPrimaryPeer()})
	if err != nil {
		panic(fmt.Errorf("SendInstantiateProposal return error: %v", err))
	}

	for _, v := range transactionProposalResponse {
		if v.Err != nil {
			panic(fmt.Errorf("SendInstantiateProposal Endorser %s return error: %v", v.Endorser, v.Err))
		}
	}

	if _, err = util.CreateAndSendTransaction(channel, transactionProposalResponse); err != nil {
		panic(fmt.Errorf("CreateTransaction return error: %v", err))
	}

	bigMsg("Instantiation successfully sent")
}

func getClient() api.FabricClient {
	configImpl, err := config.InitConfig(ConfigFile)
	if err != nil {
		panic(err)
	}

	err = bccspFactory.InitFactories(configImpl.GetCSPConfig())
	if err != nil {
		panic(fmt.Errorf("Failed getting ephemeral software-based BCCSP [%s]", err))
	}

	cryptoSuite := bccspFactory.GetDefault()

	client := client.NewClient(configImpl)
	client.SetCryptoSuite(cryptoSuite)

	return client
}

func queryBlob(channel api.Channel, key string) {
	transactionProposalResponses, _, err := util.CreateAndSendTransactionProposal(channel, chaincodeID, TestChannel, []string{"query", key}, []api.Peer{channel.GetPrimaryPeer()}, nil)
	if err != nil {
		panic(fmt.Errorf("queryBlob return error: %v", err))
	}

	bigMsg(fmt.Sprintf("Query result is: '%s'", transactionProposalResponses[0].ProposalResponse.GetResponse().Payload))
}

func deleteBlob(channel api.Channel, key string) {
	transactionProposalResponses, _, err := util.CreateAndSendTransactionProposal(channel, chaincodeID, TestChannel, []string{"delete", key}, []api.Peer{channel.GetPrimaryPeer()}, nil)
	if err != nil {
		bigMsg(fmt.Sprintf("Cannot delete blob: %s", err))
		os.Exit(0)
	}
	_, err = util.CreateAndSendTransaction(channel, transactionProposalResponses)
	if err != nil {
		panic(fmt.Errorf("deleteBlob transaction return error: %v", err))
	}

	bigMsg("Transaction successfully broadcast")
}

func setBlob(channel api.Channel, key, value string) {
	transactionProposalResponses, _, err := util.CreateAndSendTransactionProposal(channel, chaincodeID, TestChannel, []string{"set", key, value}, []api.Peer{channel.GetPrimaryPeer()}, nil)
	if err != nil {
		bigMsg(fmt.Sprintf("Cannot set blob: %s", err))
		os.Exit(0)
	}
	_, err = util.CreateAndSendTransaction(channel, transactionProposalResponses)
	if err != nil {
		panic(fmt.Errorf("setBlob transaction return error: %v", err))
	}

	bigMsg("Transaction successfully broadcast")
}

func main() {
	app := kingpin.New("client", "A command-line interface to the plob (permissioned blob) chaincode application.")
	user := app.Flag("user", "User context to run the client in, for instance, org1.Admin, or org2.User").OverrideDefaultFromEnvar("FABRIC_USER").Short('u').Required().String()

	install := app.Command("install", fmt.Sprintf("Install the chaincode to the peers defined in %s", ConfigFile))

	instantiate := app.Command("instantiate", fmt.Sprintf("Instantiate the chaincode on channel %s", TestChannel))

	query := app.Command("query", "Query the chaincode blob")
	queryKey := query.Arg("key", "Key to query").Required().String()

	del := app.Command("delete", "Delete the chaincode blob")
	delKey := del.Arg("key", "Key to delete").Required().String()

	set := app.Command("set", "Set a permissioned blob")
	setKey := set.Arg("key", "Key to set").Required().String()
	setValue := set.Arg("blob", "Blob to set key to").Required().String()

	client := getClient()

	setUser := func() {
		userArgs := strings.Split(*user, ".")
		if len(userArgs) != 2 {
			panic("User must be specified as <org>.User or <org>.Admin")
		}

		var userContext api.User
		var err error
		switch userArgs[1] {
		case "Admin":
			userContext, err = GetAdmin(client, userArgs[0])
		case "User":
			userContext, err = GetUser(client, userArgs[0])
		default:
			panic("User must be specified as <org>.User or <org>.Admin")
		}

		if err != nil {
			panic(err)
		}

		client.SetUserContext(userContext)
	}

	switch kingpin.MustParse(app.Parse(os.Args[1:])) {
	// Install Chaincode
	case install.FullCommand():
		setUser()
		installCC(client)

	// Instantiate Chaincode
	case instantiate.FullCommand():
		setUser()
		channel := getChannel(client, TestChannel)
		instantiateCC(channel)

	// Query Blob
	case query.FullCommand():
		setUser()
		channel := getChannel(client, TestChannel)
		queryBlob(channel, *queryKey)

	// Delete Blob
	case del.FullCommand():
		setUser()
		channel := getChannel(client, TestChannel)
		deleteBlob(channel, *delKey)

	// Set Blob
	case set.FullCommand():
		setUser()
		channel := getChannel(client, TestChannel)
		setBlob(channel, *setKey, *setValue)
	}
}
