'use strict';

const logger = require('logger');
const fs = require('fs');
let fileOptions, gpgOptions;

const readData = (data, args) =>
    new Promise((resolve, reject) => {
        const gpg = spawn(args);
        const buffer = [];
        let bufferLen = 0;
        let error = '';

        gpg.stdout.on('data', buff => {
            buffer.push(buff);
            bufferLen += buff.length;
        });

        gpg.stderr.on('data', buff => error += buff.toString('utf8'));

        gpg.on('close', code => {
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

const readFile = srcPath =>
    new Promise((resolve, reject) =>
        fs.readFile(srcPath, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    );

const setOptions = options => {
    if (Array.isArray(options)) {
        gpgOptions = options;
        fileOptions = {};
    } else {
        gpgOptions = options.gpg;
        fileOptions = options.file;
    }
};

const spawn = args => require('child_process').spawn('gpg', args);

const writeFile = (destPath, data) =>
    new Promise((resolve, reject) =>
        fs.writeFile(destPath, data, err => {
            if (err) {
                reject(err);
            } else {
                resolve(destPath);
            }
        })
    );

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

    return readFile(srcPath)
    .then(data => readData(data, gpgOptions))
    .then(data => {
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
module.exports.stream = (srcPath, destPath, options, isData) =>
    new Promise((resolve, reject) => {
        setOptions(options);

        let writable = destPath ?
            fs.createWriteStream(destPath, fileOptions) :
            process.stdout;

        if (srcPath === destPath) {
            reject('This is a streaming API.\nThe destination cannot be the same as the source.\nAborting.');
        } else {
            process.on('SIGINT', () => (logger.info('\nAborted!'), process.exit()));

            if (isData) {
                readData(srcPath, gpgOptions)
                .then(data => (writable.write(data), resolve(destPath)))
                .catch(reject);
            } else {
                // http://bit.ly/1WoAMFT
                let gpg = spawn(gpgOptions);

                fs.createReadStream(srcPath)
                .on('error', reject)
                .pipe(gpg.stdin);

                gpg.stdout.pipe(writable)
                .on('error', reject)
                .on('close', () => resolve(destPath));
            }
        }
    });

