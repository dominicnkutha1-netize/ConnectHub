'use strict';

/**
 * Structured JSON logging.
 *
 * Plain console.log is unreadable once there is more than one user: you get
 * timestamps, ids and levels mixed into prose. JSON lines can be shipped to
 * any log platform and filtered on fields, so that is what we emit everywhere.
 */

const pino = require('pino');
const config = require('./config');

const logger = pino({
  level: config.logLevel,
  base: { service: 'connecthub', env: config.env },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Never let a token reach a log file — logs get copied into tickets and
  // pasted into chats far more often than people expect.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'req.body.password',
    ],
    censor: '[redacted]',
  },
});

module.exports = logger;
