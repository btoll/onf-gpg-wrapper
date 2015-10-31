/* eslint-disable no-console */
(function () {
    'use strict';

    let fs = require('fs'),
        spawn;

    spawn = function (args) {
        return require('child_process').spawn('gpg', args);
    };

    module.exports.stream = function (src, dest, args) {
        return new Promise(function (resolve, reject) {
            var gpg = spawn(args),
                writable = dest ?
                    fs.createWriteStream(dest) :
                    process.stdout;

            if (src === dest) {
                reject('[ERROR] This is a streaming API.\nThe destination cannot be the same as the source.\nAborting.');
            } else {
                process.on('SIGINT', function () {
                    console.log('\n[INF] Aborted!');
                    process.exit();
                });

                // http://bit.ly/1WoAMFT
                fs.createReadStream(src)
                    .on('error', reject)
                    .pipe(gpg.stdin);

                gpg.stdout.pipe(writable)
                    .on('error', reject)
                    .on('close', function () {
                        resolve('Created file ' + dest);
                    });
            }
        });
    };
}());

