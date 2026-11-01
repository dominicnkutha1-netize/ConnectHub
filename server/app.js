'use strict';

/**
 * The HTTP application.
 *
 * Kept separate from index.js on purpose: this module builds and returns an
 * Express app and never calls listen(). That means tests can drive it directly
 * with supertest, and the process bootstrap (sockets, signals, shutdown) stays
 * in one small file.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const { rateLimit } = require('express-rate-limit');

const config = require('./config');
const logger = require('./logger');
const { authenticate } = require('./auth');
const { isWritable } = require('./db');
const { metricsMiddleware, metricsHandler } = require('./metrics');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const friendRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/uploads');

function requestLogger() {
  return pinoHttp({
    logger,
    // Accept an inbound request id so a trace can cross services, else make one.
    genReqId(req, res) {
      const id = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    autoLogging: {
      ignore: (req) => req.url === '/healthz' || req.url === '/readyz' || req.url === '/metrics',
    },
    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
  });
}

function corsMiddleware() {
  if (config.corsOrigins === '*') {
    // Development default. Production sets an explicit allowlist.
    return cors({ origin: true, credentials: false });
  }
  return cors({
    origin(origin, callback) {
      // Same-origin requests and server-to-server calls have no Origin header.
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: false,
  });
}

function securityHeaders() {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        // React sets inline style attributes in a few components; the app has
        // no inline <script>, which is the part that actually matters for XSS.
        'style-src': ["'self'", "'unsafe-inline'"],
        'img-src': ["'self'", 'data:', 'blob:'],
        'connect-src': ["'self'", 'ws:', 'wss:'],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
      },
    },
    // The client is served from the same origin; COEP only breaks uploads here.
    crossOriginEmbedderPolicy: false,
  });
}

function rateLimiters() {
  if (!config.rateLimit.enabled) return { auth: (req, res, next) => next(), api: (req, res, next) => next() };

  const auth = rateLimit({
    windowMs: config.rateLimit.authWindowMs,
    max: config.rateLimit.authMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, try again later' },
  });

  const api = rateLimit({
    windowMs: config.rateLimit.apiWindowMs,
    max: config.rateLimit.apiMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Health and metrics must never be throttled away.
    skip: (req) => ['/healthz', '/readyz', '/metrics'].includes(req.path),
    message: { error: 'Too many requests, slow down' },
  });

  return { auth, api };
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(securityHeaders());
  app.use(requestLogger());
  app.use(metricsMiddleware);
  app.use(corsMiddleware());
  app.use(express.json({ limit: config.bodyLimit }));
  app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

  // --- Liveness / readiness -------------------------------------------------
  // Liveness: is the process alive? Restart it if not.
  app.get('/healthz', (req, res) => {
    res.json({ status: 'ok', uptime: Math.round(process.uptime()), env: config.env });
  });

  // Readiness: should this instance receive traffic? Checks the dependency.
  app.get('/readyz', (req, res) => {
    const writable = isWritable();
    res.status(writable ? 200 : 503).json({
      status: writable ? 'ready' : 'degraded',
      checks: { datastore: writable ? 'ok' : 'unwritable' },
    });
  });

  app.get('/metrics', metricsHandler);

  const limiter = rateLimiters();
  app.use('/api/auth', limiter.auth, authRoutes);

  app.use('/api', limiter.api);

  app.use('/uploads', express.static(config.uploadsDir));
  app.use('/api/users/me/photo', authenticate, uploadRoutes);
  app.use('/api/users', authenticate, userRoutes);
  app.use('/api/posts', authenticate, postRoutes);
  app.use('/api/friends', authenticate, friendRoutes);
  app.use('/api/chat', authenticate, chatRoutes);

  // Kept for backwards compatibility with the client and the old docs.
  app.get('/api/health', (req, res) => res.json({ ok: true }));

  // Unknown API routes return JSON, not the SPA's HTML.
  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // --- Static client --------------------------------------------------------
  const indexHtml = path.join(config.clientDist, 'index.html');
  if (fs.existsSync(indexHtml)) {
    app.use(
      express.static(config.clientDist, {
        index: false,
        setHeaders(res, filePath) {
          // Hashed asset filenames can be cached forever; index.html cannot.
          const immutable = /-[A-Za-z0-9_-]{8,}\./.test(path.basename(filePath));
          res.setHeader('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=0');
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(indexHtml);
    });
  }

  // --- Errors ---------------------------------------------------------------
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const isServerError = status >= 500;

    if (req.log) {
      if (isServerError) req.log.error({ err }, 'unhandled error');
      else req.log.warn({ err }, 'request rejected');
    }

    // Never leak stack traces or internal messages to clients in production.
    res.status(status).json({
      error: isServerError && config.isProduction ? 'Internal server error' : err.message || 'Internal server error',
    });
  });

  return app;
}

module.exports = { createApp };
