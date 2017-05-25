#!/bin/bash

UP_DOWN=$1
CH_NAME=$2

COMPOSE_FILE=docker-compose.yaml
#COMPOSE_FILE=docker-compose-no-tls.yaml

function printHelp () {
	echo "Usage: ./network_setup <up|down> <channel-name>"
}

function validateArgs () {
	if [ -z "${UP_DOWN}" ]; then
		echo "Option up / down / restart not mentioned"
		printHelp
		exit 1
	fi
	if [ -z "${CH_NAME}" ]; then
		echo "setting to default channel 'mychannel'"
		CH_NAME=mychannel
	fi
}

function clearContainers () {
        CONTAINER_IDS=$(docker ps -aq)
        if [ -z "$CONTAINER_IDS" -o "$CONTAINER_IDS" = " " ]; then
                echo "---- No containers available for deletion ----"
        else
                docker rm -f $CONTAINER_IDS
        fi
}

function removeUnwantedImages() {
        DOCKER_IMAGE_IDS=$(docker images | grep "dev\|none\|test-vp\|peer[0-9]-" | awk '{print $3}')
        if [ -z "$DOCKER_IMAGE_IDS" -o "$DOCKER_IMAGE_IDS" = " " ]; then
                echo "---- No images available for deletion ----"
        else
                docker rmi -f $DOCKER_IMAGE_IDS
        fi
}

function replacePrivateKey () {
	ARCH=`uname -s | grep Darwin`
	if [ "$ARCH" == "Darwin" ]
		then
				OPTS="-it"
		else
				OPTS="-i"
	fi

	cp docker-compose-template.yaml docker-compose.yaml
  PRIV_KEY=$(ls crypto-config/ordererOrganizations/blocledger.com/orderers/orderer.blocledger.com/msp/keystore/)
  sed $OPTS  "s/ORDERER_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose.yaml
	PRIV_KEY=$(basename `ls crypto-config/peerOrganizations/org1.blocledger.com/ca/*_sk`)
  sed $OPTS "s/CA_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose.yaml
	PRIV_KEY=$(ls crypto-config/peerOrganizations/org1.blocledger.com/peers/peer0.org1.blocledger.com/msp/keystore/)
  sed $OPTS "s/PEER0_ORG1_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose.yaml
  PRIV_KEY=$(ls crypto-config/peerOrganizations/org1.blocledger.com/peers/peer1.org1.blocledger.com/msp/keystore/)
  sed $OPTS "s/PEER1_ORG1_PRIVATE_KEY/${PRIV_KEY}/g" docker-compose.yaml
}

function generateArtifacts () {
        os_arch=$(echo "$(uname -s)-$(uname -m)" | awk '{print tolower($0)}')
        if [ "$(uname -m)" = "x86_64" ]; then
                os_arch=$(echo "$(uname -s)-amd64" | awk '{print tolower($0)}')
        fi
				if [[ "$(uname -s)" = "MINGW64_NT-10.0" ]]; then
								os_arch="windows-amd64"
				fi

        echo "OS_ARCH "$os_arch
	echo
	echo "##########################################################"
	echo "############## Generate certificates #####################"
	echo "##########################################################"
        ./$os_arch/bin/cryptogen generate --config=./crypto-config.yaml
	echo
	echo

        replacePrivateKey

	echo "##########################################################"
	echo "#########  Generating Orderer Genesis block ##############"
	echo "##########################################################"
	export FABRIC_CFG_PATH=$PWD
	./$os_arch/bin/configtxgen -profile OneOrgGenesis -outputBlock orderer.block
	echo
	echo

	echo "#################################################################"
	echo "### Generating channel configuration transaction 'channel.tx' ###"
	echo "#################################################################"
	./$os_arch/bin/configtxgen -profile OneOrgChannel -outputCreateChannelTx channel.tx -channelID $CH_NAME
	echo
	echo

}

function networkUp () {
	#Lets generate all the artifacts which includes org certs, orderer.block,
        # channel configuration transaction and Also generate a docker-compose file
        generateArtifacts
        export ARCH_TAG=$(uname -m)
	CHANNEL_NAME=$CH_NAME docker-compose -f $COMPOSE_FILE up -d 2>&1
	if [ $? -ne 0 ]; then
		echo "ERROR !!!! Unable to pull the images "
		exit 1
	fi
}

function networkDown () {
        docker-compose -f $COMPOSE_FILE down
        #Cleanup the chaincode containers
	clearContainers
	#Cleanup images
	removeUnwantedImages
        # remove orderer block and channel transaction
	rm -rf orderer.block channel.tx crypto-config
	# remove the fabric ca directory to clear out old users
	rm -rf fabricca
}

validateArgs

#Create the network using docker compose
if [ "${UP_DOWN}" == "up" ]; then
	networkUp
elif [ "${UP_DOWN}" == "down" ]; then ## Clear the network
	networkDown
elif [ "${UP_DOWN}" == "restart" ]; then ## Restart the network
	networkDown
	networkUp
else
	printHelp
	exit 1
fi
