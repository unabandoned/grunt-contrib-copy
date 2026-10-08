'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('node:fs');
var path = require('node:path');
var grunt = require('./helpers/grunt');

var isWindows = process.platform === 'win32';

// A temp base directory holding test/fixtures, plus the empty folder git
// cannot track.
function setup(t) {
  var base = grunt.tempDir(t);
  fs.cpSync(grunt.fixtures, path.join(base, 'test/fixtures'), { recursive: true, preserveTimestamps: true });
  fs.mkdirSync(path.join(base, 'test/fixtures/empty_folder'));
  return base;
}

function run(base, target) {
  var result = grunt.run(base, ['copy:' + target]);
  assert.equal(result.status, 0, result.output);
  return result;
}

function tree(dir) {
  return grunt.tree(dir);
}

function mode(file) {
  return (fs.statSync(file).mode & parseInt('777', 8)).toString(8);
}

test('main: copies files, a mix of folders and files, and templated src/dest', function(t) {
  var base = setup(t);
  var result = run(base, 'main');
  assert.match(result.output, /Created 6 directories, copied 10 files/);
  var tmp = path.join(base, 'tmp');
  assert.deepEqual(tree(path.join(tmp, 'copy_test_files')), tree(path.join(grunt.expected, 'copy_test_files')));
  assert.deepEqual(tree(path.join(tmp, 'copy_test_mix')), tree(path.join(grunt.expected, 'copy_test_mix')).concat('empty_folder/').sort());
  assert.deepEqual(tree(path.join(tmp, 'copy_test_v0.1.0')), tree(path.join(grunt.expected, 'copy_test_v0.1.0')));
});

test('noexpandWild: keeps the source path under a directory dest', function(t) {
  var base = setup(t);
  run(base, 'noexpandWild');
  assert.deepEqual(tree(path.join(base, 'tmp/copy_test_noexpandWild')), tree(path.join(grunt.expected, 'copy_test_noexpandWild')));
});

test('flatten: creates a flat structure', function(t) {
  var base = setup(t);
  run(base, 'flatten');
  assert.deepEqual(tree(path.join(base, 'tmp/copy_test_flatten')), tree(path.join(grunt.expected, 'copy_test_flatten')));
});

test('single: copies one file to a file dest', function(t) {
  var base = setup(t);
  var result = run(base, 'single');
  assert.match(result.output, /Copied 1 file\b/);
  assert.equal(fs.readFileSync(path.join(base, 'tmp/single.js'), 'utf8'), fs.readFileSync(path.join(grunt.expected, 'single.js'), 'utf8'));
});

test('mode: sets an explicit file mode', { skip: isWindows }, function(t) {
  var base = setup(t);
  run(base, 'mode');
  assert.equal(mode(path.join(base, 'tmp/mode.js')), '444');
});

test('mode: sets an explicit directory mode', function(t) {
  var base = setup(t);
  run(base, 'modeDir');
  // On Windows directories have no executable flag.
  var expected = isWindows ? '666' : '777';
  assert.equal(mode(path.join(base, 'tmp/copy_test_modeDir/time_folder')), expected);
  assert.equal(mode(path.join(base, 'tmp/copy_test_modeDir/time_folder/sub_folder')), expected);
});

test('mode: true copies the source mode', { skip: isWindows }, function(t) {
  var base = setup(t);
  fs.writeFileSync(path.join(base, 'test/fixtures/executable.sh'), '#!/bin/sh\n');
  fs.chmodSync(path.join(base, 'test/fixtures/executable.sh'), parseInt('754', 8));
  run(base, 'modeKeep');
  assert.equal(mode(path.join(base, 'tmp/executable.sh')), '754');
});

test('process: rewrites text but leaves noProcess files byte-identical', function(t) {
  var base = setup(t);
  run(base, 'process');
  assert.deepEqual(fs.readFileSync(path.join(base, 'tmp/process/beep.wav')), fs.readFileSync(path.join(base, 'test/fixtures/beep.wav')));
  assert.equal(fs.readFileSync(path.join(base, 'tmp/process/test2.js'), 'utf8'), fs.readFileSync(path.join(base, 'test/fixtures/test2.js'), 'utf8') + '/* comment */');
});

test('timestamp: copies mtimes of unchanged files and directories only', function(t) {
  var base = setup(t);
  run(base, 'timestamp');
  var src = path.join(base, 'test/fixtures/time_folder');
  var dest = path.join(base, 'tmp/copy_test_timestamp');
  var mtime = function(p) {
    return fs.lstatSync(p).mtime.getTime();
  };
  // Known Node.js issue on Windows: https://github.com/nodejs/node/issues/2069
  if (!isWindows) {
    assert.equal(mtime(path.join(dest, 'sub_folder')), mtime(path.join(src, 'sub_folder')));
    assert.equal(mtime(path.join(dest, 'test.js')), mtime(path.join(src, 'test.js')));
  }
  // Renamed, and changed by process: both keep their fresh mtime.
  assert.notEqual(mtime(path.join(dest, 'test1.js')), mtime(path.join(src, 'test.js')));
  assert.notEqual(mtime(path.join(dest, 'test_process.js')), mtime(path.join(src, 'test_process.js')));
});

function setupBuild(t) {
  var base = grunt.tempDir(t);
  fs.mkdirSync(path.join(base, 'build/prod'), { recursive: true });
  fs.writeFileSync(path.join(base, 'build/prod/index.html'),
    '<html><body><a href="x.zip">Download App.zip</a> <%= pkg.version %></body></html>');
  fs.writeFileSync(path.join(base, 'build/prod/logo.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x3c, 0x25, 0x3d, 0x00, 0xff]));
  return base;
}

test('process + noProcess: copies an HTML file onto itself through grunt templates', function(t) {
  var base = setupBuild(t);
  run(base, 'inPlace');
  assert.equal(fs.readFileSync(path.join(base, 'build/prod/index.html'), 'utf8'),
    '<html><body><a href="x.zip">Download App.zip</a> 9.8.7<p>extra</p></body></html>');
});

test('process + noProcess: templated dest name, binaries untouched', function(t) {
  var base = setupBuild(t);
  run(base, 'renamed');
  assert.equal(fs.readFileSync(path.join(base, 'build/prod/App_v9.8.7.html'), 'utf8'),
    '<html><body><span>Version 9.8.7</span> 9.8.7</body></html>');
  assert.deepEqual(fs.readFileSync(path.join(base, 'build/prod/copied-logo.png')), fs.readFileSync(path.join(base, 'build/prod/logo.png')));
});

test('--no-color output carries no escape codes', function(t) {
  var base = setup(t);
  var result = run(base, 'single');
  assert.doesNotMatch(result.output, /\u001b\[/);
});
