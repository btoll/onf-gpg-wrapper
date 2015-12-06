/* eslint-disable no-console */

(() => {
    'use strict';

    let fs = require('fs'),
        fileOptions, gpgOptions;

    function readData(data, args) {
        return new Promise((resolve, reject) => {
            let gpg = spawn(args),
                buffer = [],
                bufferLen = 0,
                error = '';

            gpg.stdout.on('data', function (buff) {
                buffer.push(buff);
                bufferLen += buff.length;
            });

            gpg.stderr.on('data', function (buff) {
                error += buff.toString('utf8');
            });

            gpg.on('close', function (code) {
                if (code !== 0) {
                    // If error is empty, we probably redirected stderr to stdout
                    // (for verifySignature, import, etc).
                    reject(error);
                } else {
                    resolve(Buffer.concat(buffer, bufferLen));
                }
            });

            gpg.stdin.end(data);
        });
    }

    function readFile(srcPath) {
        return new Promise((resolve, reject) => {
            fs.readFile(srcPath, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    function setOptions(options) {
        if (Array.isArray(options)) {
            gpgOptions = options;
            fileOptions = {};
        } else {
            gpgOptions = options.gpg;
            fileOptions = options.file;
        }
    }

    function spawn(args) {
        return require('child_process').spawn('gpg', args);
    }

    function writeFile(destPath, data) {
        return new Promise((resolve, reject) => {
            fs.writeFile(destPath, data, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(`Operation on ${destPath} completed successfully`);
                }
            });
        });
    }

    /**
     * @param {string} srcPath
     * @param {string} destPath
     * @param {array/object} options
     * @param {boolean} returnAsData
     *
     * Note options can be either an Array or an Object.
     * If Array, assume it's only GPG options.
     */
    module.exports = (srcPath, destPath, options, returnAsData) => {
        // Note that it's the responsibility of the caller to handle any errors.
        setOptions(options);

        return readFile(srcPath).then((data) => {
            return readData(data, gpgOptions);
        })
        .then((data) => {
            if (!returnAsData) {
                return writeFile(destPath || srcPath, data, fileOptions);
            } else {
                return data;
            }
        });
    };

    /**
     * @param {string} srcPath
     * @param {string} destPath
     * @param {array/object} options
     * @param {boolean} isData
     *
     * Note options can be either an Array or an Object.
     * If Array, assume it's only GPG options.
     */
    module.exports.stream = (srcPath, destPath, options, isData) => {
        return new Promise((resolve, reject) => {
            let gpg, writable;

            setOptions(options);

            writable = destPath ?
                fs.createWriteStream(destPath, fileOptions) :
                process.stdout;

            if (srcPath === destPath) {
                reject('This is a streaming API.\nThe destination cannot be the same as the source.\nAborting.');
            } else {
                process.on('SIGINT', () => {
                    console.log('\nAborted!');
                    process.exit();
                });

                if (isData) {
                    readData(srcPath, gpgOptions)
                        .then((data) => {
                            writable.write(data);
                            resolve(`Operation on ${destPath} completed successfully`);
                        })
                        .catch(console.log);
                } else {
                    // http://bit.ly/1WoAMFT
                    gpg = spawn(gpgOptions);

                    fs.createReadStream(srcPath)
                        .on('error', reject)
                        .pipe(gpg.stdin);

                    gpg.stdout.pipe(writable)
                        .on('error', reject)
                        .on('close', () => {
                            resolve(`Operation on ${destPath} completed successfully`);
                        });
                }
            }
        });
    };
})();

