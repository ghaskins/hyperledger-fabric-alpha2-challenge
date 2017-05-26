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
var myApp = angular.module('myApp', ['ngAnimate', 'ngRoute',
'ngFileUpload', 'ui.bootstrap',
'ui.grid', 'ui.grid.expandable']);

//var baseUrl = 'http://localhost:5000';
var baseUrl = '.';
var activeUser;

(function() {
  'use strict';

  myApp.controller('adminCtrl', ['$scope', '$http',
  function($scope, $http) {
    $http.get(baseUrl + '/adminPriv').then(function(response) {
      if (response.data.adminPriv) {
        $scope.adminPriv = true;
      } else {
        $scope.adminPriv = false;
      }
    });

    $http.get(baseUrl + '/loggedIn').then(function(response) {
      if (response.data.loggedIn) {
        $scope.loggedIn = true;
      } else {
        $scope.loggedIn = false;
      }
    });

    $scope.deploy = function() {
      $scope.showAlert = false;
      $scope.alertMsg = '';
      $scope.showErrorAlert = false;
      $scope.alertErrorMsg = '';
      $scope.showInfo = true;
      $scope.infoMsg = 'Please wait, processing the chaincode deploy ' +
      'request may take a couple minutes.';
      $http.get(baseUrl + '/deploy').then(function(response) {
        console.log('request deploy');
        $scope.showInfo = false;
        $scope.infoMsg = '';
        $scope.showAlert = true;
        $scope.alertMsg = response.data;
      }, function(response) {
        $scope.showInfo = false;
        $scope.infoMsg = '';
        $scope.showErrorAlert = true;
        $scope.alertErrorMsg = response.data;
      });
    };
  }]).directive('admin', function() {
    return {
      controller: 'adminCtrl',
      templateUrl: 'templates/admin.html'
    };
  });

  myApp.controller('usersCtrl', ['$scope', '$http',
  function($scope, $http) {
    $scope.resetActive = function() {
      $http.put(baseUrl + '/resetUser')
      .then(function(response) {
        $scope.activeUser = response.data;
      }, function(response) {
        console.log(response.data);
      });
    };

    $scope.updateActive = function() {
      $http.get(baseUrl + '/activeUser')
      .then(function(response) {
        $scope.activeUser = response.data;
      }, function(response) {
        console.log(response.data);
      });
    };
    $scope.updateActive();

  }]).directive('users', function() {
    return {
      controller: 'usersCtrl',
    };
  });

  myApp.directive('transactionAlerts', function() {
    return {
      templateUrl: 'templates/transactionAlerts.html'
    };
  });

  // jscs:enable maximumLineLength

  myApp.controller('loginCtrl', ['$scope', '$http',
  function($scope, $http) {
    $http.get(baseUrl + '/login', null)
    .then(function(response) {
      $scope.userName = response.data.userName;
    }, function(response) {
    });

    $scope.loginFn = function() {
      var params = {
        'userName': $scope.userName,
        'userPw': $scope.userPw,
        'remember': $scope.remember,
      };
      $http.post(baseUrl + '/login', params)
      .then(function(response) {
        window.location.href = '/';
      }, function(response) {
        $scope.showErrorAlert = true;
        $scope.alertErrorMsg = response.data;
      });
    };
  }]).directive('login', function() {
    return {
      controller: 'loginCtrl',
      templateUrl: 'templates/login.html'
    };
  });

  myApp.controller('addUserCtrl', ['$scope', '$http',
  function($scope, $http) {
    $scope.addUserFn = function() {
      var params = {
        'userName': $scope.userName,
        'userPw': $scope.userPw,
        'userPwRepeat': $scope.userPwRepeat,
        'userType': $scope.userType,
      };
      $http.post(baseUrl + '/addUser', params)
      .then(function(response) {
        $scope.showInfo = true;
        $scope.infoMsg = 'User added';
      }, function(response) {
        $scope.showErrorAlert = true;
        $scope.alertErrorMsg = response.data;
      });
    };
  }]).directive('addUser', function() {
    return {
      controller: 'addUserCtrl',
      templateUrl: 'templates/addUser.html'
    };
  });

  myApp.controller('editUserCtrl', ['$scope', '$http', '$uibModal',
  function($scope, $http, $uibModal) {
    $scope.editUserFn = function() {
      var params = {
        'userName': $scope.userName,
        'userPw': $scope.userPw,
        'userPwRepeat': $scope.userPwRepeat,
        'userType': $scope.userType,
      };
      $http.post(baseUrl + '/editUser', params)
      .then(function(response) {
        $scope.showInfo = true;
        $scope.infoMsg = 'User edited';
      }, function(response) {
        $scope.showErrorAlert = true;
        $scope.alertErrorMsg = response.data;
      });
    };

    $scope.delUserFn = function() {
      var modalInstance = $uibModal.open({
        templateUrl: 'templates/confirmModal.html',
        controller: 'confirmModalCtrl',
        size: 'sm',
      });
      modalInstance.result.then(function() {  //Do this if the user selects the OK button
        var params = {
          'delUserName': $scope.delUserName,
        };
        $http.post(baseUrl + '/delUser', params)
        .then(function(response) {
          $scope.showInfo = true;
          $scope.infoMsg = 'User deleted';
          // We removed the current logged-in user, redirect and refresh to the home page, so it's apparent that the user needs to log in again.
          if (response.status == 201) {
            window.location = '/';
          }
        }, function(response) {
          $scope.showErrorAlert = true;
          $scope.alertErrorMsg = response.data;
        });
      });
    };
  }]).directive('editUser', function() {
    return {
      controller: 'editUserCtrl',
      templateUrl: 'templates/editUser.html'
    };
  });
})();
