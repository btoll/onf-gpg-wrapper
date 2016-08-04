'use strict';

const fs = require('fs');
const logger = require('logger');

const getStream = (destPath, fileOptions) =>
    destPath ?
        fs.createWriteStream(destPath, fileOptions) :
        process.stdout;

const listenForEvent = ev =>
    process.on(ev, () => (
        logger.info('\nAborted!'),
        process.exit()
    ));

const readData = (data, gpgOptions) =>
    new Promise((resolve, reject) => {
        const gpg = spawn(gpgOptions);
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

const spawn = gpgOptions => require('child_process').spawn('gpg', gpgOptions);

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
 * @param {String} srcPath
 * @param {String} destPath
 * @param {Object} fileOptions
 * @param {Array} gpgOptions
 *
 * Non-streaming API.
 */
module.exports = (srcPath, destPath, fileOptions, gpgOptions) =>
    readFile(srcPath)
    .then(data => readData(data, gpgOptions))
    .then(data => writeFile(destPath || srcPath, data, fileOptions));

module.exports.readFile = (srcPath, gpgOptions) =>
    readFile(srcPath)
    .then(data => readData(data, gpgOptions));

/**
 * @param {String} srcPath
 * @param {String} destPath
 * @param {Object} fileOptions
 * @param {Array} gpgOptions
 */
module.exports.stream = (srcPath, destPath, fileOptions, gpgOptions) =>
    new Promise((resolve, reject) => {
        if (srcPath === destPath) {
            reject('This is a streaming API.\nThe destination cannot be the same as the source.\nAborting.');
        } else {
            listenForEvent('SIGINT');

            // http://bit.ly/1WoAMFT
            let gpg = spawn(gpgOptions);

            fs.createReadStream(srcPath)
            .on('error', reject)
            .pipe(gpg.stdin);

            gpg.stdout.pipe(getStream(destPath, fileOptions))
            .on('error', reject)
            .on('close', () => resolve(destPath));
        }
    });

/**
 * @param {String} data
 * @param {String} destPath
 * @param {Object} fileOptions
 * @param {Array} gpgOptions
 */
module.exports.streamDataToFile = (data, destPath, fileOptions, gpgOptions) =>
    new Promise((resolve, reject) => {
        listenForEvent('SIGINT');

        readData(data, gpgOptions)
        .then(data => (
            getStream(destPath, fileOptions).write(data),
            resolve(destPath)
        ))
        .catch(reject);
    });

