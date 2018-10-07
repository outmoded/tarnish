'use strict';

// Load modules

const Util = require('util');
const Zlib = require('zlib');


// Declare internals

const internals = {
    filler: Buffer.alloc(1024),
    zeros: '0000000000000000000',
    sevens: '7777777777777777777'
};


// Based on tar-stream https://github.com/mafintosh/tar-stream
// Copyright (c) 2014 Mathias Buus, MIT Licensed

exports.Pack = internals.Pack = class {

    constructor() {

        this._buffers = [];
    }

    add(filename, content) {

        const buffer = Buffer.from(content);
        const length = buffer.length;

        // Write header

        const header = Buffer.alloc(512);
        header.write(filename);                                                 // Must be less than 100 characters
        header.write(internals.encode(420, 6), 100);                            // 644 base 8 - file mode
        header.write(internals.encode(0, 6), 108);                              // 0 - uid
        header.write(internals.encode(0, 6), 116);                              // 0 - gid
        header.write(internals.encode(length, 11), 124);                        // File size
        header.write(internals.encode(Date.now() / 1000, 11), 136);

        header[156] = 48;                                                       // '0' (48) + 0 - file type
        header.write('ustar\x0000', 257);

        header.write(internals.encode(0, 6), 329);                              // 0 - dev major
        header.write(internals.encode(0, 6), 337);                              // 0 - dev minor
        header.write(internals.encode(internals.checksum(header), 6), 148);

        this._buffers.push(header);
        this._buffers.push(buffer);

        const overflow = length & 511;
        if (overflow) {
            this._buffers.push(internals.filler.slice(0, 512 - overflow));
        }
    }

    generate(options = {}) {

        const tar = Buffer.concat(this._buffers.concat(internals.filler));
        if (!options.gzip) {
            return tar;
        }

        return internals.gzip(tar);
    }
};


internals.checksum = function (block) {

    let sum = 8 * 32;
    for (let i = 0; i < 148; ++i) {
        sum += block[i];
    }

    for (let i = 156; i < 512; ++i) {
        sum += block[i];
    }

    return sum;
};


internals.encode = function (value, pos) {

    value = value.toString(8);
    if (value.length > pos) {
        return internals.sevens.slice(0, pos) + ' ';
    }

    return internals.zeros.slice(0, pos - value.length) + value + ' ';
};


internals.gzip = Util.promisify(Zlib.gzip);
