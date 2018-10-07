'use strict';

// Load modules

const Code = require('code');
const Lab = require('lab');
const Tarnish = require('..');
const TarStream = require('tar-stream');
const Wreck = require('wreck');


// Declare internals

const internals = {};


// Test shortcuts

const { describe, it } = exports.lab = Lab.script();
const expect = Code.expect;


describe('Tarnish', () => {

    it('generates a tar buffer', async () => {

        const pack = new Tarnish.Pack();
        pack.add('hello.txt', 'This is a hello file');
        pack.add('image.jpg', Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]));
        const tar = pack.generate();

        const files = await internals.unpack(tar);
        expect(files).to.equal({
            'hello.txt': 'This is a hello file',
            'image.jpg': '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007\u0008\u0009'
        });
    });

    it('generates a tar buffer (full packet)', async () => {

        const buffer = Buffer.alloc(1024);

        const pack = new Tarnish.Pack();
        pack.add('big.dat', buffer);
        const tar = pack.generate();

        const files = await internals.unpack(tar);
        expect(files['big.dat']).to.equal(buffer.toString());
    });
});


internals.unpack = function (tar) {

    return new Promise((resolve, reject) => {

        const extract = TarStream.extract();

        const files = {};
        extract.on('entry', async (header, stream, next) => {

            files[header.name] = (await Wreck.read(stream)).toString();
            next();
        });

        extract.on('finish', () => resolve(files));
        Wreck.toReadableStream(tar).pipe(extract);
    });
};
