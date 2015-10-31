/* eslint-disable no-console */
(() => {
    'use strict';

    let fs = require('fs'),
        spawn;

    spawn = (args) => {
        return require('child_process').spawn('gpg', args);
    };

    module.exports.stream = (src, dest, args) => {
        return new Promise((resolve, reject) => {
            let gpg = spawn(args),
                writable = dest ?
                    fs.createWriteStream(dest) :
                    process.stdout;

            if (src === dest) {
                reject('[ERROR] This is a streaming API.\nThe destination cannot be the same as the source.\nAborting.');
            } else {
                process.on('SIGINT', () => {
                    console.log('\n[INF] Aborted!');
                    process.exit();
                });

                // http://bit.ly/1WoAMFT
                fs.createReadStream(src)
                    .on('error', reject)
                    .pipe(gpg.stdin);

                gpg.stdout.pipe(writable)
                    .on('error', reject)
                    .on('close', () => {
                        resolve('Created file ' + dest);
                    });
            }
        });
    };
}());

