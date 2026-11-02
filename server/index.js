'use strict';

/**
 * Process bootstrap: HTTP server, WebSocket transport, signals, shutdown.
 *
 * This file exists to do exactly one thing — start the process and stop it
 * cleanly. Anything that could be tested against the app lives in app.js.
 */

const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const config = require('./config');
const logger = require('./logger');
const { createApp } = require('./app');
const { data, scheduleSave, flush, getId } = require('./db');
const { seedDemoData } = require('./seed');

// Before the port opens: on an ephemeral host the store is empty after every
// restart, and a visitor should never be the first thing to see that.
const seed = seedDemoData();

const app = createApp();
const server = http.createServer(app);

// Keep-alive slightly above the usual 30s load balancer idle timeout so the
// platform, not us, decides when a connection is dead.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

const io = new Server(server, {
  cors: {
    origin: config.corsOrigins === '*' ? true : config.corsOrigins,
    credentials: false,
  },
});

io.use((socket, next) => {
  const token = (socket.handshake.auth || {}).token;
  if (!token) return next(new Error('Not authorized'));
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    socket.userId = payload.id;
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user_${socket.userId}`);
  logger.debug({ userId: socket.userId, socketId: socket.id }, 'socket connected');

  socket.on('chat:send', ({ toId, content } = {}) => {
    const fromId = socket.userId;
    const text = String(content || '').trim().slice(0, 2000);
    if (!text || !Number(toId)) return;

    const sender = data.users.find((user) => user.id === fromId);
    if (!sender) return;

    const message = {
      id: getId('messages'),
      fromId,
      toId: Number(toId),
      content: text,
      createdAt: Date.now(),
    };

    data.messages.push(message);
    scheduleSave();

    io.to(`user_${message.toId}`).emit('chat:receive', message);
    io.to(`user_${fromId}`).emit('chat:sent', message);
  });

  socket.on('disconnect', (reason) => {
    logger.debug({ userId: socket.userId, reason }, 'socket disconnected');
  });
});

server.listen(config.port, () => {
  logger.info(
    {
      port: config.port,
      env: config.env,
      pid: process.pid,
      node: process.version,
      dataDir: config.dataDir,
      client: config.isProduction ? config.clientDist : 'vite dev server',
    },
    'connecthub started'
  );

  if (config.jwtSecretSource === 'ephemeral') {
    logger.warn(
      'JWT_SECRET is not set. Using a random key for this process only — ' +
        'every restart will invalidate all sessions. Set JWT_SECRET before deploying.'
    );
  }

  if (seed.seeded) {
    logger.info(
      {
        ...seed.counts,
        demoEmail: seed.credentials.email,
        demoPassword: seed.credentials.password,
      },
      'demo data seeded (public credentials, see README)'
    );
  } else {
    logger.info({ reason: seed.reason }, 'demo seed skipped');
  }
});

server.on('error', (err) => {
  logger.fatal({ err }, 'server failed to start');
  process.exit(1);
});

let shuttingDown = false;

/**
 * Graceful shutdown.
 *
 * Order matters: stop taking new work, drain sockets, flush the debounced
 * write, then exit. Without the flush, the last 150ms of user activity is
 * silently lost on every deploy.
 */
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'shutdown requested');

  const forceExit = setTimeout(() => {
    logger.error('shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  io.close();
  if (typeof server.closeIdleConnections === 'function') server.closeIdleConnections();

  server.close((err) => {
    if (err) {
      logger.error({ err }, 'error closing http server');
    }
    try {
      flush();
      logger.info('shutdown complete');
      process.exit(0);
    } catch (flushErr) {
      logger.error({ err: flushErr }, 'failed to flush data during shutdown');
      process.exit(1);
    }
  });
}

['SIGTERM', 'SIGINT'].forEach((signal) => process.on(signal, () => shutdown(signal)));

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaught exception, exiting');
  shutdown('uncaughtException');
});
