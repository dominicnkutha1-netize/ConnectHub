'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeClient, register } = require('./helpers');

const { app, request } = makeClient();

const auth = (token) => ({ Authorization: `Bearer ${token}` });

// A 1x1 transparent PNG — the smallest thing that is genuinely an image.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

test('a user can upload a profile photo', async () => {
  const { token } = await register(request, app);

  const res = await request(app)
    .post('/api/users/me/photo')
    .set(auth(token))
    .attach('photo', PNG, { filename: 'me.png', contentType: 'image/png' })
    .expect(200);

  assert.match(res.body.photo, /^\/uploads\//);

  const me = await request(app).get('/api/users/me').set(auth(token)).expect(200);
  assert.equal(me.body.photo, res.body.photo);
});

test('non-image uploads are rejected with 400, not 500', async () => {
  const { token } = await register(request, app);

  const res = await request(app)
    .post('/api/users/me/photo')
    .set(auth(token))
    .attach('photo', Buffer.from('#!/bin/sh\nrm -rf /\n'), {
      filename: 'script.sh',
      contentType: 'text/x-shellscript',
    })
    .expect(400);

  assert.match(res.body.error, /only image/i);
});

test('upload requires authentication', async () => {
  await request(app).post('/api/users/me/photo').attach('photo', PNG, 'me.png').expect(401);
});

test('a request with no file is rejected', async () => {
  const { token } = await register(request, app);
  const res = await request(app).post('/api/users/me/photo').set(auth(token)).expect(400);
  assert.match(res.body.error, /no file/i);
});
