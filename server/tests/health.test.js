'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeClient } = require('./helpers');

const { app, request } = makeClient();

test('liveness probe reports the process is alive', async () => {
  const res = await request(app).get('/healthz').expect(200);
  assert.equal(res.body.status, 'ok');
  assert.ok(res.body.uptime >= 0);
});

test('readiness probe checks the data store', async () => {
  const res = await request(app).get('/readyz').expect(200);
  assert.equal(res.body.status, 'ready');
  assert.equal(res.body.checks.datastore, 'ok');
});

test('metrics endpoint exposes Prometheus text format', async () => {
  const res = await request(app).get('/metrics').expect(200);
  assert.match(res.headers['content-type'], /text\/plain/);
  assert.match(res.text, /connecthub_process_cpu_seconds_total/);
  assert.match(res.text, /connecthub_http_request_duration_seconds/);
});

test('security headers are present and express is not advertised', async () => {
  const res = await request(app).get('/healthz').expect(200);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['x-frame-options'], 'SAMEORIGIN');
  assert.ok(res.headers['content-security-policy'], 'expected a CSP header');
  assert.equal(res.headers['x-powered-by'], undefined);
});

test('inbound request id is echoed back for tracing', async () => {
  const res = await request(app).get('/healthz').set('x-request-id', 'trace-abc-123');
  assert.equal(res.headers['x-request-id'], 'trace-abc-123');
});

test('unknown API routes return JSON, not HTML', async () => {
  const res = await request(app).get('/api/does-not-exist').expect(404);
  assert.equal(res.body.error, 'Not found');
});

test('legacy health endpoint still answers', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.deepEqual(res.body, { ok: true });
});

test('protected routes reject requests with no token', async () => {
  const res = await request(app).get('/api/users/me').expect(401);
  assert.equal(res.body.error, 'Not authenticated');
});

test('protected routes reject a malformed token', async () => {
  const res = await request(app).get('/api/users/me').set('Authorization', 'Bearer not-a-jwt').expect(401);
  assert.equal(res.body.error, 'Invalid or expired token');
});
