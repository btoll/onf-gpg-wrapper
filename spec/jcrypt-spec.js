// TODO: DRY!

'use strict';

const fs = require('fs');
const jcrypt = require('../index');

const fileContents = 'hello, world!';
const tmpFile = (new Date().getTime()).toString();
const tmpFile2 = `${tmpFile}_foo`;

const gpgOptions = [
    '--armor',
    '-r', '4406864D',
    '-s'
];

const readFile = (file) =>
    new Promise(resolve =>
        fs.readFile(file, (err, data) =>
            resolve(data)
        )
    );

const writeFile = (file, data) =>
    new Promise(resolve =>
        fs.writeFile(file, data, () =>
            resolve(file)
        )
    );

describe('jcrypt', () => {
    afterAll(() => {
        fs.unlinkSync(tmpFile);
        fs.unlinkSync(tmpFile2);
    });

    describe('#decrypt', () => {
        it('should work', done =>
            jcrypt.encrypt(gpgOptions, 'foobaz')
            .then(jcrypt.decrypt)
            .then(data => {
                expect(data.toString()).toBe('foobaz');
                done();
            })
        );
    });

    describe('#decryptFile', () => {
        it('should return the cleartext file contents', done =>
            jcrypt.encrypt(gpgOptions, fileContents)
            .then(enciphered => writeFile(tmpFile, enciphered))
            .then(() =>
                jcrypt.decryptFile(tmpFile)
                .then(data => {
                    expect(data.toString()).toBe(fileContents);
                    done();
                })
            )
        );
    });

    describe('#decryptDataToFile', () => {
        it('should be able to create a new file', done =>
            jcrypt.encrypt(gpgOptions, fileContents)
            .then(jcrypt.decryptDataToFile(tmpFile))
            .then(readFile)
            .then(cleartext => {
                expect(cleartext.toString()).toBe(fileContents);
                done();
            })
        );

        it('should be able to write cleartext to an existing file', done =>
            writeFile(tmpFile, fileContents)
            .then(() =>
                jcrypt.encrypt(gpgOptions, fileContents)
                .then(jcrypt.decryptDataToFile(tmpFile))
                .then(readFile)
                .then(cleartext => {
                    expect(cleartext.toString()).toBe(fileContents);
                    done();
                })
            )
        );
    });

    describe('#decryptToFile', () => {
        it('should write to file', done =>
            jcrypt.encrypt(gpgOptions, fileContents)
            .then(enciphered => writeFile(tmpFile, enciphered))
            .then(encryptedFile => jcrypt.decryptToFile(tmpFile2, encryptedFile))
            .then(readFile)
            .then(cleartext => {
                expect(cleartext.toString()).toBe(fileContents);
                done();
            })
        );

        it('should write in-place', done =>
            jcrypt.encrypt(gpgOptions, fileContents)
            .then(enciphered => writeFile(tmpFile, enciphered))
            .then(encryptedFile => jcrypt.decryptToFile(null, encryptedFile))
            .then(readFile)
            .then(cleartext => {
                expect(cleartext.toString()).toBe(fileContents);
                done();
            })
        );
    });

    describe('#encrypt', () => {
        it('should work', done =>
            jcrypt.encrypt(gpgOptions, 'foobar')
            .then(data => {
                expect(/BEGIN PGP MESSAGE/.test(data.toString())).toBe(true);
                done();
            })
        );
    });

    describe('#encryptFile', () => {
        it('should stream the enciphered file contents', done =>
            writeFile(tmpFile, fileContents)
            .then(() =>
                jcrypt.encryptFile(gpgOptions, tmpFile)
                .then(data => {
                    expect(/BEGIN PGP MESSAGE/.test(data.toString())).toBe(true);
                    done();
                })
            )
        );
    });

    describe('#encryptDataToFile', () => {
        it('should be able to create a new file', done =>
            jcrypt.encryptDataToFile(gpgOptions, tmpFile, fileContents)
            .then(jcrypt.decryptFile)
            .then(cleartext => {
                expect(cleartext.toString()).toBe(fileContents);
                done();
            })
        );

        it('should be able to write enciphered text to an existing file', done =>
            writeFile(tmpFile, fileContents)
            .then(() =>
                jcrypt.encryptDataToFile(gpgOptions, tmpFile, fileContents)
                .then(jcrypt.decryptFile)
                .then(cleartext => {
                    expect(cleartext.toString()).toBe(fileContents);
                    done();
                })
            )
        );
    });

    describe('#encryptToFile', () => {
        it('should write to file', done =>
            writeFile(tmpFile, fileContents)
            .then(() =>
                jcrypt.encryptToFile(gpgOptions, tmpFile2, tmpFile)
                .then(jcrypt.decryptFile)
                .then(cleartext => {
                    expect(cleartext.toString()).toBe(fileContents);
                    done();
                })
            )
        );

        it('should write in-place', done =>
            writeFile(tmpFile, fileContents)
            .then(() =>
                jcrypt.encryptToFile(gpgOptions, null, tmpFile)
                .then(readFile)
                .then(data => {
                    expect(/BEGIN PGP MESSAGE/.test(data.toString())).toBe(true);
                    done();
                })
            )
        );
    });

    describe('#getDefaultWriteOptions', () => {
        it('should work', () =>
            expect(jcrypt.getDefaultWriteOptions()).not.toBeUndefined()
        );
    });

    describe('#setDefaultWriteOptions', () => {
        it('should allow the write options to be changed', () => {
            const getDefaultWriteOptions = jcrypt.getDefaultWriteOptions;
            const oldOptions = getDefaultWriteOptions();

            // Change the flags and the mode.
            jcrypt.setDefaultWriteOptions({
                defaultEncoding: 'utf8',
                encoding: 'utf8',
                fd: null,
                flags: 'a',
                mode: 0o0777
            });

            expect(getDefaultWriteOptions().flags).not.toBe(oldOptions.flags);
            expect(getDefaultWriteOptions().mode).not.toBe(oldOptions.mode);
        });
    });
});

