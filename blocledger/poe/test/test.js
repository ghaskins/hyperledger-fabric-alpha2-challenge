var assert = require('chai').assert;
var request = require('superagent').agent();
var util = require('../util.js');
var url = 'http://localhost:3000';

var testTimeout = 15000;  //wait time in milliseconds before failing a test

// dummy hash values for testing
var hash1 = 'hash1-1234567890123456789012345678901234567890123456789012345678'
var hash2 = 'hash2-1234567890123456789012345678901234567890123456789012345678'

//Test adding a new user
describe('Add new user test:', function() {
  describe('/addUser POST', function() {
    it('should return success from the POST call', function(done) {
      this.timeout(testTimeout);
      request
      .post(url + '/addUser')
      .send({userName: 'test@blocledger.com', userPw: 'abc', userPwRepeat: 'abc', userType: 'user'})
      .end(function(err, res) {
        if (err) {
          // console.log(err);
          assert.equal(res.status, 500, 'should receive a 500 status');
          assert.equal(res.text, 'User name is already in use');
        } else {
          // console.log(res);
          assert.property(res, 'status', 'reply should have status');
          assert.equal(res.status, 200, 'should receive a 200 status');
        }
        done();
      });
    });
  });
});

//testing the Application REST interface that uses the node SDK
describe('Application REST interface', function() {
  describe('login user', function() {
    it('should login the test user', function(done) {
      request
      .post(url + '/login')
      .send({'userName': 'test@blocledger.com', 'userPw': 'abc', 'remember': false})
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(err.response.error);
        assert.equal(res.status, 200, 'should receive a 200 status');
        done();
      })
    });
  });

  describe('/addDoc', function() {
    it('should add a document to the blockchain', function(done) {
      this.timeout(testTimeout);
      request
      .post(url + '/addDoc')
      .send({hash: hash1, name: 'dummyFile1.txt', owner: 'Alice', hashType: 'sha256'})
      .end(function(err, res) {
      // console.log(err);
      assert.isNull(err);
      // console.log(res.body);
      assert.isArray(res.body);
      assert.property(res.body[0], 'state', 'reply should have a state member');
      assert.isString(res.body[0].state, 'the state should be a string');
      assert.equal(res.body[0].state, 'fulfilled', 'the state value should be fulfilled');
      done();
      });
    });
    it('should add a second document', function(done) {
      this.timeout(testTimeout);
      request
      .post(url + '/addDoc')
      .send({hash: hash2, name: 'dummyFile2.txt', owner: 'Bob', hashType: 'sha256'})
      .end(function(err, res) {
      assert.isNull(err);
      //console.log(res.body);
      assert.isArray(res.body);
      assert.property(res.body[0], 'state', 'reply should have a state member');
      assert.isString(res.body[0].state, 'the state should be a string');
      assert.equal(res.body[0].state, 'fulfilled', 'the state value should be fulfilled');
      done();
      });
    });
  });
  describe('/listDoc', function(){
    it('should return a list of users', function(done) {
      this.timeout(testTimeout);
      request
      .get(url + '/listDoc')
      .accept('application/json')
      .end(function(err, res) {
        assert.isNull(err);
        // console.log(res.body);
        assert.property(res.body, hash1, 'hash1 should be in the list');
        var doc = JSON.parse(res.body[hash1]);
        assert.property(doc, 'Owner', 'Document owner should be present');
        assert.equal(doc.Owner, 'test@blocledger.com', 'the owner should be test@blocledger.com');
        done();
      });
    });
  });
  describe('/transferDoc', function() {
    it('should transfer doc from Alice to Bob', function(done) {
      this.timeout(testTimeout);
      request
      .post(url + '/editDoc')
      .send({hash: hash1, owner: 'Bob'})
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(res.body);
        assert.isArray(res.body);
        assert.property(res.body[0], 'state', 'reply should have a state member');
        assert.isString(res.body[0].state, 'the state should be a string');
        assert.equal(res.body[0].state, 'fulfilled', 'the state value should be fulfilled');
        done();
      });
    });
    it('Bob should be the new owner', function(done) {
      this.timeout(testTimeout);
      request
      .get(url + '/listDoc')
      .end(function(err, res) {
        assert.isNull(err);
        // console.log(res.body);
        assert.property(res.body, hash1, 'hash1 should be in the list');
        var doc = JSON.parse(res.body[hash1]);
        assert.property(doc, 'Owner', 'Document owner should be present');
        assert.equal(doc.Owner, 'Bob', 'the owner should be Bob');
        done();
      });
    });
  });

  describe('/verifyDoc', function() {
    it('should be able to verify the document exists', function(done) {
      this.timeout(testTimeout);
      request
      .get(url + '/verifyDoc/' + hash1)
      .end(function(err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200, 'should receive a 200 status');
        // console.log(res.body);
        assert.property(res.body, 'Hash', 'response should have a Hash');
        assert.equal(res.body.Hash, hash1, 'the hash should be the same as the input hash');
        done();
      });
    });
    it('should report an error for an unknown hash value', function(done) {
      this.timeout(testTimeout);
      request
      .get(url + '/verifyDoc/' + 'abcd1234')
      .end(function(err, res) {
        // console.log(res);
        assert.isNull(err);
        assert.equal(res.status, 200, 'should receive a 200 status');
        assert.property(res.body, 'Error', 'response should have a Error field');
        assert.equal(res.body.Error, 'Document not found', 'should return document not found');
        done();
      });
    });

  });
  describe('/delDoc', function() {
    it('should delete a test document', function(done) {
      this.timeout(testTimeout);
      request
      .post(url + '/delDoc')
      .send({hash: hash1})
      .end(function(err, res) {
      assert.isNull(err);
      //console.log(res.body);
      assert.isArray(res.body);
      assert.property(res.body[0], 'state', 'reply should have a state member');
      assert.isString(res.body[0].state, 'the state should be a string');
      assert.equal(res.body[0].state, 'fulfilled', 'the state value should be fulfilled');
      done();
      });
    });
    it('should delete second test document', function(done) {
      this.timeout(testTimeout);
      request
      .post(url + '/delDoc')
      .send({hash: hash2})
      .end(function(err, res) {
      assert.isNull(err);
      //console.log(res.body);
      assert.isArray(res.body);
      assert.property(res.body[0], 'state', 'reply should have a state member');
      assert.isString(res.body[0].state, 'the state should be a string');
      assert.equal(res.body[0].state, 'fulfilled', 'the state value should be fulfilled');
      done();
      });
    });
    it('both test documents should be gone', function(done) {
      this.timeout(testTimeout);
      request
      .get(url + '/listDoc')
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(res.body);
        assert.notProperty(res.body, hash1, 'hash1 should not be in the list');
        assert.notProperty(res.body, hash2, 'hash2 should be not in the list');
        done();
      });
    });
  });
});
