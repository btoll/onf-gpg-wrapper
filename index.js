// The idea is not to pass the writeOptions upon every call to encryptToFile or decryptToFile b/c/ it makes the API
// cumbersome and the write options probably won't change from write to write. At this point, we're defining sensible
// defaults and exposing an API (setDefaultWriteOptions) if the user wants to set their own.

'use strict';

const R = require('ramda');
const cp = require('child_process');
const fs = require('fs');
const logger = require('logger');

let defaultWriteOptions = {
    defaultEncoding: 'utf8',
    encoding: 'utf8',
    fd: null,
    flags: 'w',
    mode: 0o0600
};

const getStream = (dest, writeOptions) =>
    dest ?
        fs.createWriteStream(dest, writeOptions) :
        process.stdout;

const listenForEvent = ev =>
    process.on(ev, () => (
        logger.info('\nAborted!'),
        process.exit()
    ));

const processData = R.curry((gpgConfig, data) =>
    new Promise((resolve, reject) => {
        const gpg = spawn(gpgConfig);
        const buffer = [];

        let bufferLen = 0;
        let error = '';

        gpg.stdout.on('data', buff => (
            buffer.push(buff),
            bufferLen += buff.length
        ));

        gpg.stderr.on('data', buff => error += buff.toString('utf8'));

        gpg.on('close', code => {
            if (code !== 0) {
                // If error is empty, we probably redirected stderr to stdout (for verifySignature, import, etc).
                reject(error);
            } else {
                resolve(Buffer.concat(buffer, bufferLen));
            }
        });

        gpg.stdin.end(data);
    }));

const processFile = (target, dest, gpgConfig, isData) =>
    new Promise((resolve, reject) => {
        if (!dest) {
            // Write in-place if it's the same file.
            readFile(target)
            .then(processData(gpgConfig))
            .then(writeFile(target, defaultWriteOptions))
            .then(resolve)
            .catch(reject);
        } else {
            // Else, stream!
            listenForEvent('SIGINT');

            if (!isData) {
                // http://bit.ly/1WoAMFT
                const gpg = spawn(gpgConfig);

                fs.createReadStream(target)
                .on('error', reject)
                .pipe(gpg.stdin);

                gpg.stdout.pipe(getStream(dest, defaultWriteOptions))
                .on('error', reject)
                .on('close', () => resolve(dest));
            } else {
                processData(gpgConfig, target)
                .then(writeFile(dest, defaultWriteOptions))
                .then(resolve)
                .catch(reject);
            }
        }
    });

const readFile = target =>
    new Promise((resolve, reject) =>
        fs.readFile(target, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    );

const setDefaultWriteOptions = writeOptions =>
    defaultWriteOptions = writeOptions;

const spawn = gpgConfig =>
    cp.spawn('gpg', gpgConfig);

const writeFile = R.curry((dest, writeOptions, data) =>
    new Promise((resolve, reject) =>
        fs.writeFile(dest, data, writeOptions, err => {
            if (err) {
                reject(err);
            } else {
                resolve(dest);
            }
        })
    )
);

//
// FP and Ramda FTW
//
// Decryption.
const decrypt = processData(['--decrypt']);
const decryptFile = R.composeP(decrypt, readFile);
const decryptDataToFile = R.curry((dest, target) =>
    processFile(target, dest, ['--decrypt'], true));
const decryptToFile = R.curry((dest, target) =>
    processFile(target, dest, ['--decrypt'], false));

// Encryption.
const addEncryptionOptions = R.concat(['--encrypt']);
const addOptionsAndProcessData = R.compose(processData, addEncryptionOptions);

const encrypt = R.curry((gpgConfig, data) =>
    addOptionsAndProcessData(gpgConfig)(data));
const encryptFile = R.curry((gpgConfig, filename) =>
    readFile(filename).then(addOptionsAndProcessData(gpgConfig)));
const encryptDataToFile = R.curry((gpgConfig, dest, target) =>
    processFile(target, dest, addEncryptionOptions(gpgConfig), true));
const encryptToFile = R.curry((gpgConfig, dest, target) =>
    processFile(target, dest, addEncryptionOptions(gpgConfig), false));

module.exports = {
    /**
     * @param {String} data
     * @return {Promise}
     *
     * Decrypts `data` string.
     */
    decrypt,

    /**
     * @param {String} dest
     * @param {String} data
     * @return {Promise}
     *
     * Decrypts data and writes it to `dest`.
     *
     * Will use the file write options passed into #setDefaultWriteOptions or
     * the system defaults:
     *
     *      defaultEncoding: 'utf8'
     *      encoding: 'utf8'
     *      fd: null
     *      flags: 'w'
     *      mode: 0o0600
     */
    decryptDataToFile,

    /**
     * @param {String} filename
     * @return {Promise}
     *
     * Decrypts file and returns it as cleartext. It does not change
     * the target file.
     *
     * Use #decryptToFile if wanting to write file contents to a file.
     */
    decryptFile,

    /**
     * @param {String/Null} dest
     * @param {String} filename
     * @return {Promise}
     *
     * Decrypts file and writes it to `dest`.
     * Passing `null` as `dest` will write the file in-place.
     *
     * Will use the file write options passed into #setDefaultWriteOptions or
     * the system defaults:
     *
     *      defaultEncoding: 'utf8'
     *      encoding: 'utf8'
     *      fd: null
     *      flags: 'w'
     *      mode: 0o0600
     */
    decryptToFile,

    /**
     * @param {Array} gpgConfig
     * @param {String} data
     * @return {Promise}
     *
     * Encrypts `data` string.
     */
    encrypt,

    /**
     * @param {String} dest
     * @param {String} data
     * @return {Promise}
     *
     * Encrypts data and writes it to `dest`.
     *
     * Will use the file write options passed into #setDefaultWriteOptions or
     * the system defaults:
     *
     *      defaultEncoding: 'utf8'
     *      encoding: 'utf8'
     *      fd: null
     *      flags: 'w'
     *      mode: 0o0600
     */
    encryptDataToFile,

    /**
     * @param {Array} gpgConfig
     * @param {String} filename
     * @return {Promise}
     *
     * Encrypts file and returns it as a ciphered stream. It does not change
     * the target file.
     *
     * Use #encryptToFile if wanting to write file contents to a file.
     */
    encryptFile,

    /**
     * @param {Array} gpgConfig
     * @param {String/Null} dest
     * @param {String} filename
     * @return {Promise}
     *
     * Encrypts file and writes it to `dest`.
     * Passing `null` as `dest` will write the file in-place.
     *
     * Will use the file write options passed into #setDefaultWriteOptions or
     * the system defaults:
     *
     *      defaultEncoding: 'utf8'
     *      encoding: 'utf8'
     *      fd: null
     *      flags: 'w'
     *      mode: 0o0600
     */
    encryptToFile,

    setDefaultWriteOptions
};

