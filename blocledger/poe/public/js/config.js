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

angular.
  module('myApp').
  config(['$locationProvider', '$routeProvider',
    function config($locationProvider, $routeProvider) {
      'use strict';
      $locationProvider.hashPrefix('!');

      $routeProvider.
        when('/poeApp', {
          template: '<poe-app></poe-app>'
        }).
        when('/verifyDoc', {
          template: '<verify-doc></verify-doc>'
        }).
        when('/listDoc', {
          template: '<list-doc></list-doc>'
        }).
        when('/admin', {
          template: '<admin></admin>'
        }).
        when('/login', {
          template: '<login></login>'
        }).
        when('/addUser', {
          template: '<add-user></add-user>'
        }).
        when('/editUser', {
          template: '<edit-user></edit-user>'
        }).
        otherwise('/');
    }
  ]);
