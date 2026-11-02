'use strict';

/**
 * Single source of truth for runtime configuration.
 *
 * Everything the app needs to run comes from environment variables, with
 * development fallbacks. Nothing is required to be edited by hand, and a
 * missing production secret fails at startup rather than at 3am.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

function int(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Signing key resolution, in order of preference:
 *   1. JWT_SECRET environment variable (what production should use)
 *   2. server/secret.js, for people running it locally the old way
 *   3. a random per-process key, so a fresh clone still starts
 *
 * In production, 1 or 2 is mandatory. A random key in production would mean
 * every deploy silently logs all users out, so we refuse instead.
 */
function resolveJwtSecret() {
  const fromEnv = (process.env.JWT_SECRET || '').trim();
  if (fromEnv) {
    if (fromEnv.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }
    return { secret: fromEnv, source: 'env' };
  }

  const secretFile = path.join(__dirname, 'secret.js');
  if (fs.existsSync(secretFile)) {
    const exported = require(secretFile);
    if (typeof exported === 'string' && exported.length >= 32) {
      return { secret: exported, source: 'file' };
    }
    throw new Error('server/secret.js must export a string of at least 32 characters');
  }

  if (isProduction) {
    throw new Error(
      'JWT_SECRET is required when NODE_ENV=production. Generate one with:\n' +
        "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  return { secret: crypto.randomBytes(32).toString('hex'), source: 'ephemeral' };
}

function parseOrigins(raw) {
  if (!raw || !raw.trim() || raw.trim() === '*') return '*';
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const { secret: jwtSecret, source: jwtSecretSource } = resolveJwtSecret();

const config = {
  env: NODE_ENV,
  isProduction,
  isTest,

  port: int(process.env.PORT, 4000),

  // Express must trust the platform's proxy (Render, Fly, Heroku) or every
  // request looks like it came from the load balancer, which breaks rate
  // limiting and makes logs useless.
  trustProxy: process.env.TRUST_PROXY !== 'false',

  logLevel: process.env.LOG_LEVEL || (isTest ? 'silent' : 'info'),

  jwtSecret,
  jwtSecretSource,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',

  dataDir: path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data')),
  uploadsDir: path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, 'uploads')),
  maxUploadBytes: int(process.env.MAX_UPLOAD_BYTES, 5 * 1024 * 1024),
  bodyLimit: process.env.BODY_LIMIT || '100kb',

  // Seeds a small demo network on boot, but only into an empty store. Used by
  // the public deployment, where the filesystem is wiped between restarts.
  seedDemo: ['1', 'true', 'yes', 'on'].includes(
    String(process.env.SEED_DEMO || '').trim().toLowerCase()
  ),

  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),

  // In production the API also serves the built React client, so one
  // container is a complete deployment.
  clientDist: path.resolve(
    process.env.CLIENT_DIST || path.join(__dirname, '..', 'client', 'dist')
  ),

  rateLimit: {
    // Disabled under test so the suite is not throttled into failing.
    enabled: process.env.RATE_LIMIT !== 'off' && !isTest,
    authWindowMs: int(process.env.AUTH_RATE_WINDOW_MS, 15 * 60 * 1000),
    authMax: int(process.env.AUTH_RATE_MAX, 20),
    apiWindowMs: int(process.env.API_RATE_WINDOW_MS, 60 * 1000),
    apiMax: int(process.env.API_RATE_MAX, 300),
  },
};

module.exports = config;
