const { Corpus } = require('./base');
const BinaryFile = require('binary-file');
const fs = require('fs');
const path = require('path');


class FilesystemCorpusBlock {
    constructor(dataRoot, id, folderId, blockSize) {
        this.dataRoot = dataRoot;
        this.id = id;
        this.folderId = folderId;
        this.blockSize = blockSize;
        this.lines = new Array(Number(blockSize));
        this.lastChanged = false;
    }
    // Necessary to allow change tracking
    async setLine(idx, value) {
        this.lines[idx] = value;
        this.lastChanged = Date.now();
    }
    async read() {
        if(!fs.existsSync(this.getPath())) {
            return;
        }

        const file = new BinaryFile(this.getPath(), 'r');
        await file.open();
        for(let i=0; i<Number(this.blockSize); i++) {
            let line = '';
            const lineLength = await file.readUInt16();
            for(let j=0; j<lineLength; j++) {
                line += String.fromCharCode(await file.readUInt8());
            }
            if(line.length > 0) {
                this.lines[i] = line;
            }
        }
        return file.close();
    }
    async write() {
        if(this.isEmpty()) {
            return;
        }

        if(!fs.existsSync(this.getFolder())) {
            fs.mkdirSync(this.getFolder());
        }

        const file = new BinaryFile(this.getPath(), 'w');
        await file.open();
        for(let i=0; i<Number(this.blockSize); i++) {
            let line = this._toAscii(this.lines[i]);
            // Prevent overflow of string length
            if(line.length > 65535) {
                line = line.slice(0, 65535)
            }
            await file.writeUInt16(line.length);
            for(let j=0; j<line.length; j++) {
                await file.writeUInt8(line.charCodeAt(j));
            }
        }
        return file.close();
    }
    getFolder() {
        return path.join(this.dataRoot, this.folderId.toString());
    }
    getPath() {
        return path.join(this.getFolder(), this.id.toString() + '.bin');
    }
    isEmpty() {
        for(let line of this.lines) {
            if(line) return false;
        }
        return true;
    }

    _toAscii(str='') {
        return str.replace(/[^\x00-\x7F]/g, '');
    }
}

class FilesystemCorpus extends Corpus {
    constructor(blockSize=1000n, blocksPerFolder=1000n, dataRoot=path.join(process.cwd(), 'data')) {
        super();

        this.dataRoot = dataRoot;
        this.blockSize = blockSize;
        this.blocksPerFolder = blocksPerFolder;
        this.loadedBlocks = {};

        if(!fs.existsSync(dataRoot)) {
            fs.mkdirSync(dataRoot);
        }
    }
    async getLine(lineNumber) {
        const blockId = lineNumber / this.blockSize;
        await this._loadBlock(blockId);
        return this.loadedBlocks[blockId].lines[lineNumber % this.blockSize] || '';
    }
    async setLine(lineNumber, value) {
        const blockId = lineNumber / this.blockSize;
        await this._loadBlock(blockId);
        this.loadedBlocks[blockId].setLine(lineNumber % this.blockSize, value);
        // TODO: This should be moved to an async process
    }
    async save() {
        let savedBlocks = 0;
        const loadedBlockIds = Object.keys(this.loadedBlocks);
        for(let i=0; i<loadedBlockIds.length; i++) {
            const block = this.loadedBlocks[loadedBlockIds[i]];
            if(block.lastChanged !== false) {
                await block.write();
                block.lastChanged = false;
                savedBlocks++;
            }
        }

        return savedBlocks;
    }
    _getBlockFolderId(id) {
        return id / this.blocksPerFolder;
    }
    async _loadBlock(id) {
        if(!this.loadedBlocks[id]) {
            const block = new FilesystemCorpusBlock(this.dataRoot, id, this._getBlockFolderId(id), this.blockSize);
            await block.read();
            this.loadedBlocks[id] = block;
        }
    }
}


module.exports = { Corpus: FilesystemCorpus };