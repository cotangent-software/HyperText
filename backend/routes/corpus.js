const express = require('express');
const router = express.Router();
const corpus = require('../corpus');


setInterval(() => {
    console.log('Saving corpus...');
    corpus.save().then((blockCount) => {
        console.log(`Saved ${blockCount} corpus blocks`);
    }).catch((err) => {
        console.error('Error saving corpus');
        console.error(err);
    });
}, 10000);

router.use((req, res, next) => {
    res.setHeader('content-type', 'text/plain');
    next();
});

router.get('/:lineRange', async (req, res, next) => {
    const lineRange = req.params.lineRange.split('-');
    if(lineRange.length === 1) {
        res.send(await corpus.getLine(BigInt(lineRange[0])));
    }
    else {
        for(let i=BigInt(lineRange[0]); i<BigInt(lineRange[1]); i++) {
            res.write(await corpus.getLine(i));
            res.write('\n');
        }
        res.end();
    }
});

module.exports = router;
