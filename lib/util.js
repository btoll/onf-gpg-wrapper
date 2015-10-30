/* eslint-disable no-console */
(function () {
    'use strict';

    let fs = require('fs'),
        inquirer = require('inquirer'),
        decrypt, encrypt, doFile, doStream, getOutputFilename, spawn, stream;

    decrypt = function (args) {
        let defaultArgs = ['--decrypt'];

        return spawn(defaultArgs.concat(args || []));
    };

    encrypt = function (args) {
        // For now, we'll always default to me and using ASCII armored output.
        let defaultArgs = ['--encrypt', '-r', 'benjam72@yahoo.com', '--armor'];

        return spawn(defaultArgs.concat(args || []));
    };

    doFile = function (operation, cfg) {
        getOutputFilename(cfg)
        .then(stream.bind(null, operation(), cfg.filename))
        .then(console.log)
        .catch(function (err) {
            console.log(err);
            process.exit();
        });
    };

    doStream = function (operation, src, dest) {
        stream(operation(), src, dest)
        .then(console.log)
        .catch(function (err) {
            console.log(err);
            process.exit();
        });
    };

    getOutputFilename = function (cfg) {
        return new Promise(function (resolve, reject) {
            var filename = cfg.filename,
                output = cfg.output;

            if (!output) {
                inquirer.prompt([{
                    type: 'input',
                    name: 'output',
                    message: 'Name of outputted file:',
                    default: filename
                }], function (answers) {
                    var output;

                    if ((output = answers.output)) {
                        if (filename === output) {
                            reject('[ERROR] This is a streaming API.\nThe destination cannot be the same as the source.\nAborting.');
                        } else {
                            resolve(output);
                        }
                    } else {
                        reject('[ERROR] No output file given');
                    }
                });
            } else {
                resolve(output);
            }
        });
    };

    spawn = function (args) {
        return require('child_process').spawn('gpg', args);
    };

    stream = function (gpg, src, dest) {
        return new Promise(function (resolve, reject) {
            var readable = src ? fs.createReadStream(src) : process.stdin,
                writable = dest ? fs.createWriteStream(dest) : process.stdout;

            process.on('SIGINT', function () {
                console.log('\n[INF] Aborted!');
                process.exit();
            });

            // http://bit.ly/1WoAMFT
            readable
            .on('error', reject)
            .pipe(gpg.stdin);

            gpg.stdout.pipe(writable)
            .on('error', reject)
            .on('close', function () {
                resolve('Created file ' + dest);
            });
        });
    };

    module.exports = {
        decryptFile: function (cfg) {
            doFile(decrypt, cfg);
        },

        encryptFile: function (cfg) {
            doFile(encrypt, cfg);
        },

        decryptStream: function (src, dest) {
            doStream(decrypt, src, dest);
        },

        encryptStream: function (src, dest) {
            doStream(encrypt, src, dest);
        }
    };
}());

