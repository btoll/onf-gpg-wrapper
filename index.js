'use strict';

const fs = require('fs');
const logger = require('logger');

let defaultWriteOptions = {
    defaultEncoding: 'utf8',
    encoding: 'utf8',
    fd: null,
    flags: 'w',
    mode: 0o0600
};

// TODO: (dest, writeOptions = defaultWriteOptions)
const getStream = (dest, writeOptions) =>
    dest ?
        fs.createWriteStream(dest, writeOptions || defaultWriteOptions) :
        process.stdout;

const listenForEvent = ev =>
    process.on(ev, () => (
        logger.info('\nAborted!'),
        process.exit()
    ));

// Note: `data` last for partial application!
const processData = (gpgConfig, data) =>
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
    });

// Note: `data` last for partial application!
const processFile = (filename, dest, gpgConfig, writeOptions, data) => {
    new Promise((resolve, reject) => {
        if (!dest) {
            // Write in-place if it's the same file.
            writeFile(filename, data, writeOptions);
        } else {
            // Else, stream!
            listenForEvent('SIGINT');

            // http://bit.ly/1WoAMFT
            const gpg = spawn(gpgConfig);

            fs.createReadStream(filename)
            .on('error', reject)
            .pipe(gpg.stdin);

            gpg.stdout.pipe(getStream(dest, writeOptions))
            .on('error', reject)
            .on('close', () => resolve(dest));
        }
    });
};

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

const setDefaultWriteOptions = writeOptions => defaultWriteOptions = writeOptions;
const spawn = gpgConfig => require('child_process').spawn('gpg', gpgConfig);

// TODO: (dest, data, writeOptions = defaultWriteOptions)
const writeFile = (dest, data, writeOptions) =>
    new Promise((resolve, reject) =>
        fs.writeFile(dest, data, writeOptions || defaultWriteOptions, err => {
            if (err) {
                reject(err);
            } else {
                resolve(dest);
            }
        })
    );

//
// FP helper functions.
//
// Decryption.
const decryptToFileComposed = fileEncryptionMethod => (filename, dest, writeOptions) =>
    fileEncryptionMethod(filename)
    .then(processFile.bind(null, filename, dest, ['--decrypt'], writeOptions));

const decrypt = processData.bind(null, ['--decrypt']);
const decryptFile = filename => readFile(filename).then(decrypt);
const decryptToFile = decryptToFileComposed(decryptFile);

// Encryption.
const addEncryptSwitch = gpgConfig => ['--encrypt'].concat(gpgConfig);
const processDataComposed = gpgConfig => data => processData(addEncryptSwitch(gpgConfig), data);

const encryptToFileComposed = fileEncryptionMethod => (filename, dest, gpgConfig, writeOptions) =>
    fileEncryptionMethod(filename, gpgConfig)
    .then(processFile.bind(null, filename, dest, addEncryptSwitch(gpgConfig), writeOptions));

const encrypt = (data, gpgConfig) => processDataComposed(gpgConfig)(data);
const encryptFile = (filename, gpgConfig) => readFile(filename) .then(processDataComposed(gpgConfig));
const encryptToFile = encryptToFileComposed(encryptFile);

module.exports = {
    /**
     * @param {String} data
     * @return {Promise}
     *
     * Decrypts `data` string.
     */
    decrypt,

    /**
     * @param {String} filename
     * @return {Promise}
     *
     * Decrypts file.
     */
    decryptFile,

    /**
     * @param {String} filename
     * @param {String} dest
     * @param {Object} [writeOptions] Defaults to `defaultWriteOptions`.
     * @return {Promise}
     *
     * Decrypts file and writes it to `dest`.
     */
    decryptToFile,

    /**
     * @param {String} data
     * @param {Array} gpgConfig
     * @return {Promise}
     *
     * Encrypts `data` string.
     */
    encrypt,

    /**
     * @param {String} filename
     * @param {Array} gpgConfig
     * @param {Object} [writeOptions] Defaults to `defaultWriteOptions`.
     * @return {Promise}
     *
     * Encrypts file.
     */
    encryptFile,

    /**
     * @param {String} filename
     * @param {String} dest
     * @param {Array} gpgConfig
     * @param {Object} [writeOptions] Defaults to `defaultWriteOptions`.
     * @return {Promise}
     *
     * Encrypts file and writes it to `dest`.
     */
    encryptToFile,

    setDefaultWriteOptions
};

