'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeClient, register } = require('./helpers');

const { app, request } = makeClient();

test('registration returns a token and never the password hash', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Lerato', email: 'lerato@example.com', password: 'correct-horse-battery' })
    .expect(201);

  assert.ok(res.body.token, 'expected a token');
  assert.equal(res.body.user.email, 'lerato@example.com');
  assert.equal(res.body.user.password, undefined);
  assert.equal(res.body.user.passwordHash, undefined);
});

test('email is normalised to lowercase', async () => {
  await request(app)
    .post('/api/auth/register')
    .send({ name: 'Case', email: '  MiXeD@Example.COM  ', password: 'correct-horse-battery' })
    .expect(201);

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'mixed@example.com', password: 'correct-horse-battery' })
    .expect(200);

  assert.equal(res.body.user.email, 'mixed@example.com');
});

test('duplicate registration is rejected with 409', async () => {
  await register(request, app, { email: 'dupe@example.com' });
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Dupe', email: 'dupe@example.com', password: 'correct-horse-battery' })
    .expect(409);

  assert.match(res.body.error, /already registered/i);
});

test('short passwords are rejected', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Short', email: 'short@example.com', password: '123' })
    .expect(400);

  assert.match(res.body.error, /at least 6/i);
});

test('missing fields are rejected', async () => {
  await request(app).post('/api/auth/register').send({ name: 'No Email' }).expect(400);
});

test('login succeeds with the right password', async () => {
  const { email, password } = await register(request, app);
  const res = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  assert.ok(res.body.token);
});

test('login fails with the wrong password', async () => {
  const { email } = await register(request, app);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'wrong-password' })
    .expect(401);
  assert.equal(res.body.error, 'Invalid email or password');
});

test('login for an unknown user gives the same error as a wrong password', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ghost@example.com', password: 'whatever-goes-here' })
    .expect(401);
  assert.equal(res.body.error, 'Invalid email or password');
});

test('a valid token grants access to /api/users/me', async () => {
  const { token, user } = await register(request, app);
  const res = await request(app).get('/api/users/me').set('Authorization', `Bearer ${token}`).expect(200);
  assert.equal(res.body.id, user.id);
});

test('a token signed with the wrong secret is rejected', async () => {
  const jwt = require('jsonwebtoken');
  const forged = jwt.sign({ id: 1 }, 'a-different-secret-that-is-long-enough-here', { expiresIn: '1h' });
  await request(app).get('/api/users/me').set('Authorization', `Bearer ${forged}`).expect(401);
});
