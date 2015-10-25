(function () {
    'use strict';

    let fs = require('fs'),
        inquirer = require('inquirer'),
        decrypt, encrypt, gpg, makeFile, writeFile, spawnGPG;

    /**
     * @private
     */
    gpg = function (data, args, callback) {
        let spawn = require('child_process').spawn,
            buffers = [],
            buffersLen = 0,
            error = '',
            proc = spawn('gpg', args);

        proc.stdout.on('data', function (buff) {
            buffers.push(buff);
            buffersLen += buff.length;
        });

        proc.stderr.on('data', function (buff) {
            error += buff.toString('utf8');
        });

        proc.on('close', function (code) {
            if (code !== 0) {
                // If error is empty, we probably redirected stderr to stdout
                // (for verifySignature, import, etc).
                callback(code);
            } else {
                callback(null, Buffer.concat(buffers, buffersLen));
            }
        });

        proc.stdin.end(data);
    };

    /**
     * @private
     */
    decrypt = function (data) {
        return spawnGPG(data, ['--decrypt']);
    };

    /**
     * @private
     */
    encrypt = function (sign, recipients, armor, data) {
        let args = ['--encrypt'];

        if (sign) {
            args.push('--sign');
        }

        // For now, we'll always default to me.
        if (!recipients) {
            args.push('-r', 'benjam72@yahoo.com');
        }

        // For now, we'll always create using ASCII armored output.
        if (!armor) {
            args.push('--armor');
        }

        return spawnGPG(data, args);
    };

    module.exports.decryptFile = function (cfg) {
        makeFile({
            filename: cfg.filename,
            output: cfg.output,
            operation: decrypt,
            callback: cfg.callback
        });
    };

    module.exports.encryptFile = function (cfg) {
        makeFile({
            filename: cfg.filename,
            output: cfg.output,
            operation: encrypt.bind(null, cfg.sign, cfg.recipients, cfg.armor),
            callback: cfg.callback
        });
    };

    /**
     * @private
     */
    makeFile = function (cfg) {
        let filename = cfg.filename;

        fs.readFile(filename, 'utf8', function (err, data) {
            if (err) {
                return cfg.callback(err);
            }

            cfg.operation(data).then(function (data) {
                // Returns a Promise.
                return writeFile(filename, cfg.output, data);
            }).then(function (output) {
                cfg.callback(null, output);
            }).catch(cfg.callback);
        });
    };

    /**
     * @private
     * Returns a Promise.
     */
    spawnGPG = function (data, args) {
        return new Promise(function (resolve, reject) {
            gpg(data, args, function (err, buff) {
                if (err) {
                    reject(err);
                } else {
                    resolve(buff);
                }
            });
        });
    };

    /**
     * @private
     * Returns a Promise.
     */
    writeFile = (function () {
        function write(output, data, resolve, reject) {
            fs.writeFile(output, data, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(output);
                }
            });
        }

        return function (filename, output, buff) {
            return new Promise(function (resolve, reject) {
                if (!output) {
                    inquirer.prompt([{
                        type: 'input',
                        name: 'output',
                        message: 'Name of outputted file:',
                        default: filename
                    }], function (answers) {
                        write(answers.output, buff, resolve, reject);
                    });
                } else {
                    write(output, buff, resolve, reject);
                }
            });
        };
    }());
}());

