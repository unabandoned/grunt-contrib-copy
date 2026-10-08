'use strict';

var path = require('node:path');

// Run by test/helpers/grunt.js with --base set to a temporary directory that
// holds a copy of test/fixtures, so every path below is relative to it.
module.exports = function(grunt) {
  grunt.initConfig({
    pkg: { version: '9.8.7' },

    testVars: {
      name: 'grunt-contrib-copy',
      version: '0.1.0',
      match: 'folder_one/*'
    },

    copy: {
      main: {
        files: [
          { expand: true, cwd: 'test/fixtures', src: ['*.js'], dest: 'tmp/copy_test_files/' },
          { expand: true, cwd: 'test/fixtures', src: ['**', '!*.wav'], dest: 'tmp/copy_test_mix/' },
          { expand: true, cwd: 'test/fixtures', src: ['<%= testVars.match %>'], dest: 'tmp/copy_test_v<%= testVars.version %>/' }
        ]
      },

      noexpandWild: {
        files: [
          { src: 'test/fixtures/*.js', dest: 'tmp/copy_test_noexpandWild/' }
        ]
      },

      flatten: {
        files: [
          { expand: true, flatten: true, filter: 'isFile', src: ['test/fixtures/**', '!**/*.wav'], dest: 'tmp/copy_test_flatten/' }
        ]
      },

      single: {
        files: [
          { src: ['test/fixtures/test.js'], dest: 'tmp/single.js' }
        ]
      },

      mode: {
        options: {
          mode: '0444'
        },
        src: ['test/fixtures/test2.js'],
        dest: 'tmp/mode.js'
      },

      modeDir: {
        options: {
          mode: '0777'
        },
        files: [{
          expand: true,
          cwd: 'test/fixtures/',
          src: ['time_folder/**'],
          dest: 'tmp/copy_test_modeDir/'
        }]
      },

      modeKeep: {
        options: {
          mode: true
        },
        src: ['test/fixtures/executable.sh'],
        dest: 'tmp/executable.sh'
      },

      process: {
        options: {
          noProcess: ['test/fixtures/beep.wav'],
          process: function (content) {
            return content + '/* comment */';
          }
        },
        files: [{ expand: true, cwd: 'test/fixtures', src: ['test2.js', 'beep.wav'], dest: 'tmp/process/' }]
      },

      timestamp: {
        options: {
          process: function (content, srcpath) {
            if (srcpath === 'test/fixtures/time_folder/test_process.js') {
              return 'with process and file contents were changed';
            } else {
              return content;
            }
          },
          timestamp: true
        },
        files: [
          { expand: true, cwd: 'test/fixtures/time_folder/', src: ['**'], dest: 'tmp/copy_test_timestamp/' },
          { src: 'test/fixtures/time_folder/test.js', dest: 'tmp/copy_test_timestamp/test1.js' }
        ]
      },

      // The shape of CyberChef's copy:ghPages and copy:standalone targets:
      // process only HTML, run grunt templates, copy onto itself or a
      // templated name.
      inPlace: {
        options: {
          process: function (content, srcpath) {
            if (srcpath.indexOf('index.html') >= 0) {
              content = content.replace('</body></html>', '<p>extra</p></body></html>');
              return grunt.template.process(content, srcpath);
            }
            return content;
          },
          noProcess: ['**', '!**/*.html']
        },
        files: [{ src: ['build/prod/index.html'], dest: 'build/prod/index.html' }]
      },
      renamed: {
        options: {
          process: function (content, srcpath) {
            if (srcpath.indexOf('index.html') >= 0) {
              content = content.replace(/<a [^>]+>Download.+?<\/a>/, '<span>Version <%= pkg.version %></span>');
              return grunt.template.process(content, srcpath);
            }
            return content;
          },
          noProcess: ['**', '!**/*.html']
        },
        files: [
          { src: ['build/prod/index.html'], dest: 'build/prod/App_v<%= pkg.version %>.html' },
          { src: ['build/prod/logo.png'], dest: 'build/prod/copied-logo.png' }
        ]
      }
    }
  });

  grunt.loadTasks(path.join(__dirname, '..', 'tasks'));
};
