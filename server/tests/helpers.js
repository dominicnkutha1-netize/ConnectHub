'use strict';

/**
 * Test harness.
 *
 * node:test is built into Node, so there is no test framework to install or
 * configure — just supertest to drive the app without opening a port.
 *
 * Every test file gets its own temporary data directory, so tests never touch
 * a developer's real db.json and never interfere with each other.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function makeClient(env = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'connecthub-test-'));

  // Must be set before config/db are required for the first time.
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'silent';
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-to-be-accepted-by-config';
  process.env.DATA_DIR = path.join(root, 'data');
  process.env.UPLOADS_DIR = path.join(root, 'uploads');
  // Per-file overrides, e.g. SEED_DEMO for the seed tests.
  Object.assign(process.env, env);

  const request = require('supertest');
  const { createApp } = require('../app');

  return { app: createApp(), request, root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

/** Register a user and return the token + user object. */
async function register(request, app, overrides = {}) {
  const body = {
    name: 'Test User',
    email: `user${Math.random().toString(36).slice(2, 10)}@example.com`,
    password: 'correct-horse-battery',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(body).expect(201);
  return { token: res.body.token, user: res.body.user, password: body.password, email: body.email };
}

module.exports = { makeClient, register };
