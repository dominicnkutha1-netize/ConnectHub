'use strict';

const jwt = require('jsonwebtoken');
const config = require('./config');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(header.slice(7), config.jwtSecret);
    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function signToken(id) {
  return jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

module.exports = { authenticate, signToken };
