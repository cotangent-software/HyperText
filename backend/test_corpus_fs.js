const { Corpus } = require('./corpus/drivers/fs');

async function exec() {
    const corpus = new Corpus();
    for(let i=0; i<1000; i++) {
        await corpus.setLine(BigInt(i), 'This is line ' + i + '! --- ' + Math.random().toString())
    }

    console.time();
    console.log(await corpus.getLine(3n));
    console.timeEnd();
    console.time();
    console.log(await corpus.getLine(4n));
    console.timeEnd();
    console.time();
    console.log(await corpus.getLine(7n));
    console.timeEnd();
}

exec();
