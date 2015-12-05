/* eslint-disable no-console */

(() => {
    'use strict';

    let fs = require('fs');


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
                    reject(code);
                } else {
                    resolve(Buffer.concat(buffer, bufferLen));
                }
            });

            gpg.stdin.end(data);
        });
    }

    function spawn(args) {
        return require('child_process').spawn('gpg', args);
    }

    // Public API.
    module.exports = (() => {
        function readFile(src) {
            return new Promise((resolve, reject) => {
                fs.readFile(src, (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(data);
                    }
                });
            });
        }

        function writeFile(dest, data) {
            return new Promise((resolve, reject) => {
                fs.writeFile(dest, data, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(`Operation on ${dest} completed successfully.`);
                    }
                });
            });
        }


        return (src, dest, args) => {
            // Note that it's the responsibility of the caller to handle any errors.
            return readFile(src)
                .then((data) => {
                    return readData(data, args);
                })
                .then((data) => {
                    return writeFile(dest || src, data);
                });
        };
    })();

    module.exports.stream = (src, dest, args, isData) => {
        return new Promise((resolve, reject) => {
            let gpg,
                writable = dest ?
                    fs.createWriteStream(dest) :
                    process.stdout;

            if (src === dest) {
                reject('[ERROR] This is a streaming API.\nThe destination cannot be the same as the source.\nAborting.');
            } else {
                process.on('SIGINT', () => {
                    console.log('\nAborted!');
                    process.exit();
                });

                if (isData) {
                    readData(src, args)
                        .then((data) => {
                            writable.write(data);
                            resolve(`Operation on ${dest} completed successfully.`);
                        })
                        .catch(console.log);
                } else {
                    // http://bit.ly/1WoAMFT
                    gpg = spawn(args);

                    fs.createReadStream(src)
                        .on('error', reject)
                        .pipe(gpg.stdin);

                    gpg.stdout.pipe(writable)
                        .on('error', reject)
                        .on('close', () => {
                            resolve(`Operation on ${dest} completed successfully.`);
                        });
                }
            }
        });
    };
})();

