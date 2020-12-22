const corpus = require('./corpus');

module.exports = io => {
    io.on('connection', socket => {
        console.log('a user connected');

        socket.on('fetchLines', async (lineStart, lineEnd) => {
            const lines = new Array(lineEnd - lineStart);
            for(let i=lineStart; i<lineEnd; i++) {
                lines[i-lineStart] = (await corpus.getLine(BigInt(i))) || '';
            }
            socket.emit('lines', lines);
        });

        socket.on('editInsert', async (lineNumber, lineColumn, key) => {
            const ln = BigInt(lineNumber);
            socket.broadcast.emit(`editInsert_${lineNumber}`, lineColumn, key);
            await corpus.setLine(ln, (await corpus.getLine(ln)).splice(lineColumn, 0, key));
        });
        socket.on('editBackspace', async (lineNumber, lineColumn) => {
            const ln = BigInt(lineNumber);
            socket.broadcast.emit(`editBackspace_${lineNumber}`, lineColumn);
            await corpus.setLine(ln, (await corpus.getLine(ln)).splice(lineColumn-1, 1));
        });

        socket.on('disconnect', () => {
            console.log('a user disconnected');
        });
    });
};