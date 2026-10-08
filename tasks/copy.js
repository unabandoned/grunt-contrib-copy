/*
 * grunt-contrib-copy
 * http://gruntjs.com/
 *
 * Copyright (c) 2016 Chris Talkington, contributors
 * Licensed under the MIT license.
 * https://github.com/gruntjs/grunt-contrib-copy/blob/master/LICENSE-MIT
 */

'use strict';

module.exports = function(grunt) {
  var path = require('path');
  var fs = require('fs');
  var styleText = require('util').styleText;
  var isWindows = process.platform === 'win32';

  var cyan = function(text) {
    return styleText('cyan', text);
  };

  // Byte-for-byte comparison of two files, read in chunks so large files are
  // never held in memory whole.
  var equalFiles = function(a, b) {
    var size = fs.statSync(a).size;
    if (size !== fs.statSync(b).size) {
      return false;
    }
    var bufA = Buffer.alloc(65536);
    var bufB = Buffer.alloc(65536);
    var fdA = fs.openSync(a, 'r');
    var fdB = fs.openSync(b, 'r');
    try {
      for (var pos = 0; pos < size;) {
        var readA = fs.readSync(fdA, bufA, 0, bufA.length, pos);
        var readB = fs.readSync(fdB, bufB, 0, bufB.length, pos);
        if (readA !== readB || readA === 0 || !bufA.subarray(0, readA).equals(bufB.subarray(0, readB))) {
          return false;
        }
        pos += readA;
      }
      return true;
    } finally {
      fs.closeSync(fdA);
      fs.closeSync(fdB);
    }
  };

  grunt.registerMultiTask('copy', 'Copy files.', function() {

    var options = this.options({
      encoding: grunt.file.defaultEncoding,
      // processContent/processContentExclude deprecated renamed to process/noProcess
      processContent: false,
      processContentExclude: [],
      timestamp: false,
      mode: false
    });

    var copyOptions = {
      encoding: options.encoding,
      process: options.process || options.processContent,
      noProcess: options.noProcess || options.processContentExclude
    };

    var detectDestType = function(dest) {
      if (dest.endsWith('/')) {
        return 'directory';
      } else {
        return 'file';
      }
    };

    var unixifyPath = function(filepath) {
      if (isWindows) {
        return filepath.replace(/\\/g, '/');
      } else {
        return filepath;
      }
    };

    var syncTimestamp = function (src, dest) {
      var stat = fs.lstatSync(src);
      if (path.basename(src) !== path.basename(dest)) {
        return;
      }

      if (stat.isFile() && !equalFiles(src, dest)) {
        return;
      }

      var fd = fs.openSync(dest, isWindows ? 'r+' : 'r');
      fs.futimesSync(fd, stat.atime, stat.mtime);
      fs.closeSync(fd);
    };

    var isExpandedPair;
    var dirs = {};
    var tally = {
      dirs: 0,
      files: 0
    };

    this.files.forEach(function(filePair) {
      isExpandedPair = filePair.orig.expand || false;

      filePair.src.forEach(function(src) {
        src = unixifyPath(src);
        var dest = unixifyPath(filePair.dest);

        if (detectDestType(dest) === 'directory') {
          dest = isExpandedPair ? dest : path.join(dest, src);
        }

        if (grunt.file.isDir(src)) {
          grunt.verbose.writeln('Creating ' + cyan(dest));
          grunt.file.mkdir(dest);
          if (options.mode !== false) {
            fs.chmodSync(dest, (options.mode === true) ? fs.lstatSync(src).mode : options.mode);
          }

          if (options.timestamp) {
            dirs[dest] = src;
          }

          tally.dirs++;
        } else {
          grunt.verbose.writeln('Copying ' + cyan(src) + ' -> ' + cyan(dest));
          grunt.file.copy(src, dest, copyOptions);
          if (options.timestamp !== false) {
            syncTimestamp(src, dest);
          }
          if (options.mode !== false) {
            fs.chmodSync(dest, (options.mode === true) ? fs.lstatSync(src).mode : options.mode);
          }
          tally.files++;
        }
      });
    });

    if (options.timestamp) {
      Object.keys(dirs).sort(function (a, b) {
        return b.length - a.length;
      }).forEach(function (dest) {
        syncTimestamp(dirs[dest], dest);
      });
    }

    if (tally.dirs) {
      grunt.log.write('Created ' + cyan(tally.dirs.toString()) + (tally.dirs === 1 ? ' directory' : ' directories'));
    }

    if (tally.files) {
      grunt.log.write((tally.dirs ? ', copied ' : 'Copied ') + cyan(tally.files.toString()) + (tally.files === 1 ? ' file' : ' files'));
    }

    grunt.log.writeln();
  });

};
