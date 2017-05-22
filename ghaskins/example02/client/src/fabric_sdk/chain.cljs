(ns fabric-sdk.chain
  (:require-macros [fabric-sdk.macros :as m])
  (:require [cljs.nodejs :as nodejs]
            [promesa.core :as p :include-macros true]))

(def peer (nodejs/require "fabric-client/lib/Peer.js"))
(def orderer (nodejs/require "fabric-client/lib/Orderer.js"))

(defn new [client name]
  (.newChain client name))

(defn initialize [chain]
  (m/pwrap (.initialize chain)))

(defn add-peer [chain instance]
  (.addPeer chain instance))

(defn add-orderer [chain instance]
  (.addOrderer chain instance))

(defn set-dev-mode [chain enabled]
  (.setDevMode chain enabled))

(defn send-instantiate-proposal [chain request]
  (m/pwrap (.sendInstantiateProposal chain request)))

(defn send-transaction-proposal [chain request]
  (m/pwrap (.sendTransactionProposal chain request)))

(defn send-transaction [chain request]
  (m/pwrap (.sendTransaction chain request)))

(defn query-by-chaincode [chain request]
  (m/pwrap (.queryByChaincode chain request)))
