(ns example02.api
  (:require [cljs.nodejs :as nodejs]
            [example02.rpc :as rpc]
            [promesa.core :as p :include-macros true]))

(def pb (nodejs/require "protobufjs"))

(def builder (.newBuilder pb))

(defn- loadproto [name]
  (do
    (.loadProtoFile pb (str "./protos/" name ".proto") builder)
    (.build builder name)))

(def init (loadproto "appinit"))
(def app (loadproto "org.hyperledger.chaincode.example02"))

(defn install [context]
  (-> (rpc/install context)
      (p/then #(println "Success!"))))

(defn instantiate [{:keys [args] :as context}]
  (-> context
      (assoc :func "init"
             :args (init.Init. args))
      rpc/instantiate
      (p/then #(println "Success!"))))

(defn make-payment [{:keys [args] :as context}]
  (-> context
      (assoc :func "org.hyperledger.chaincode.example02/fcn/1"
             :args (app.PaymentParams. args))
      rpc/transaction
      (p/then #(println "Success!"))))

(defn delete-account [{:keys [args] :as context}]
  (-> context
      (assoc :func "org.hyperledger.chaincode.example02/fcn/2"
             :args (app.Entity. args))
      rpc/transaction
      (p/then #(println "Success!"))))

(defn check-balance [{:keys [args] :as context}]
  (-> context
      (assoc :func "org.hyperledger.chaincode.example02/fcn/3"
             :args (app.Entity. args))
      rpc/query
      (p/then #(println "Success: Balance =" (->> % first app.BalanceResult.decode64 .-balance)))))
