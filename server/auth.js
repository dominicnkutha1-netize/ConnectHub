const jwt = require('jsonwebtoken');
const SECRET = require('./secret');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET);
    req.userId = payload.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function signToken(id) {
  return jwt.sign({ id }, SECRET, { expiresIn: '30d' });
}

module.exports = { authenticate, signToken, SECRET };