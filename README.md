# [Hyperledger Fabric](https://github.com/hyperledger/fabric ) "Alpha2 Challenge"

This repository is a rally point for the [Alpha2 Challenge Proposal](https://lists.hyperledger.org/pipermail/hyperledger-fabric/2017-May/000925.html)

## Challenge Overview
The challenge is to work with Hyperledger Fabric from the perspective of a user.  A "user" in this context is someone who is interested in developing and deploying a chaincode application on a Fabric network.  The goal is to fully immerse in the experience from this chaincode-developer / network-admin perspective to gain a better understanding/appreciation for this process in the hopes that this will help improve the v1.0 GA offering.

## Intended Audience
This challenge is open to anyone in the Hyperledger community who wishes to participate.  That said, the challenge is geared towards those who may already be familiar with the core Fabric codebase such as Fabric contributors and maintainers.  These community members are of course intimately familiar with core Fabric development, but are perhaps not as familiar with the perspective of a typical consumer of Fabric.  

# How to Participate
* Clone this repository
* Add a new subdirectory with your project ([example](./ghaskins/example02))
* Open a pull request

## Rules (well, ok, "Guidelines" since you are volunteering and all)
We are proposing several rules for this challenge that are designed to channel your experience to be as similar to what our users would face when trying to utilize Fabric for some "production" purpose.  What this means from in a practical sense is: we shouldn't cheat and run with security disabled or using methods (such as CLI invoke) that a real application would not use.  We should use released artifacts from repositories (dockerhub, npm, etc) rather than building from source.  We want to build a real(istic) application, complete with deployable chaincode and a client application written on top of one of our SDKs.  We want our application to have to deal with real security keys and configuration.  We ultimately want to know what parts of Fabric and its documentation make any of this unclear or difficult to achieve.

### Rule 1
Your application need not be complex: a few trivial transactions or a simple re-implementation of an existing example (e.g. example02, marbles, etc) is totally fine.

### Rule 2
The technology choices you make are also up to you: for example, if you want to use golang chaincde + java-sdk, chaintool/golang + node-sdk, composer, etc, that is totally up to you.  The more diversity, the better.  We suggest you pick the technologies that are most interesting to you juxtaposed against their availability/maturity in v1.0.0-alpha2. However, in the end, it's up to you.  The main point is to flush out what is currently difficult to work with and then provide feedback or patches to improve the system.

#### Rule 2a
Please document things like your technology choices in a top-level README.md of your project

### Rule 3
Try to work with released artifacts rather than building from source.  If you find that you are blocked by a bug or deficiency, file a [JIRA](https://jira.hyperledger.org).  If you are inclined, submit CRs to fix the issues you have found.

#### Rule 3a
It is ok to submit your project against a custom patched and locally compiled Fabric when necessary, but please note details such as the CRs you used to get things to work.

### Rule 4
Stand up a fabric network with real crypto and security (not pre-canned keys).  This will help to ensure that you are fully aware of all the configuration that is required of your client.

#### Note:
Using tools like fabric.git/examples/cluster, bddtests, and/or cryptogen is acceptable as I
personally feel peer/orderer configuration UX is now acceptable.  However, I would encourage everyone to at least understand what's happening there.

### Rule 5
Write a simple Fabric app complete with chaincode and SDK client

### Rule 6
Deploy your application only through the SDK rather than the CLI (except perhaps for channel create/join).

### Rule 7
As you go through the process: keep track of what points were unclear to you from a documentation perspective?  What steps were painful/awkward to deal with?  What steps, if any, didn't work or didn't work/perform as you expected?

### Rule 8
If you are unable to make your project work, please don't simply give up.  Ask questions.  File bugs.  We will conduct this challenge in a multi-round manner such that if your project is not possible to complete with v1.0.0-alpha2, perhaps it _will_ be after v1.0.0-alpha2.1, v1.0.0-alpha3, v1.0.0-beta1, etc.  The amount of releases we will produce between now and v1.0.0 GA is unknown, but could be significantly shaped by the feedback from this experiment.  The goal is that by v1.0.0 (GA), all submitted projects should be working.
