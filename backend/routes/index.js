const express = require('express');
const package = require('../package.json');
const corpusRouter = require('./corpus');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.setHeader('content-type', 'text/plain');
  res.send(`HyperText API v${package.version}`);
});

router.use('/corpus', corpusRouter);

module.exports = router;
