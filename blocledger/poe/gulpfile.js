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

/* jshint node: true */
'use strict';

var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var mocha = require('gulp-mocha');
var nodemon = require('gulp-nodemon');

// Lint Task
gulp.task('lint', function() {
  return gulp.src(['*.js','public/js/*.js'])
  .pipe(jshint())
  .pipe(jshint.reporter('default'));
});

// jscs task
gulp.task('jscs', function() {
  return gulp.src(['*.js','public/js/*.js'])
  .pipe(jscs())
  .pipe(jscs.reporter());
});

// mocha testing
gulp.task('mocha', function() {
  return gulp.src(['test/test.js'])
  .pipe(mocha({reporter: 'spec', useColors: true}));
});

// Watch Files For Changes
gulp.task('watch', function() {
  gulp.watch(['*.js','public/js/*.js', 'test/**'], ['lint', 'jscs']);
});

// Watch Files For Changes
gulp.task('watchTest', function() {
  gulp.watch(['*.js','public/js/*.js', 'test/**'], ['lint', 'jscs', 'mocha']);
});

// Testing Task
gulp.task('test', ['lint', 'jscs', 'mocha', 'watchTest']);

// Default Task
gulp.task('default', ['lint', 'jscs', 'watch']);

gulp.task('serve', ['lint', 'jscs'], function() {
  var options = {
    script: 'api.js',
    delayTime: 1,
    env: {
      'PORT': 3000,
    },
    ignore: ['test', 'public']
  };
  return nodemon(options)
  .on('restart', function(ev) {
    console.log('Restarting....');
  });
});
