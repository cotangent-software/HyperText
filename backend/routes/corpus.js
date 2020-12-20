const express = require('express');
const router = express.Router();

router.get('/', function(req, res, next) {
  res.setHeader('content-type', 'text/plain');
  res.send(`HyperText Corpus`);
});

module.exports = router;
