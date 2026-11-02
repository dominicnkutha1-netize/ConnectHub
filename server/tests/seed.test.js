'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeClient } = require('./helpers');

// SEED_DEMO has to be set before config is first required, which makeClient
// does. Each test file runs in its own process, so this does not leak.
const { app, request } = makeClient({ SEED_DEMO: '1' });

const { seedDemoData, DEMO_EMAIL, DEMO_PASSWORD } = require('../seed');
const { data } = require('../db');

const auth = (token) => ({ Authorization: `Bearer ${token}` });

async function loginAsDemo() {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: DEMO_EMAIL, password: DEMO_PASSWORD })
    .expect(200);
  return res.body.token;
}

test('seeding an empty store creates a small, complete network', () => {
  const result = seedDemoData();

  assert.equal(result.seeded, true);
  assert.deepEqual(result.credentials, { email: DEMO_EMAIL, password: DEMO_PASSWORD });

  assert.ok(data.users.length >= 4, 'expected at least 4 users');
  assert.ok(data.posts.length >= 5, 'expected at least 5 posts');
  assert.ok(data.comments.length >= 1);
  assert.ok(data.likes.length >= 1);
  assert.ok(data.messages.length >= 2);

  const accepted = data.friendships.filter((f) => f.status === 'accepted');
  assert.ok(accepted.length >= 2, 'the demo user needs friends for a non-empty feed');
  assert.ok(
    data.friendships.some((f) => f.status === 'pending' && f.toId === 1),
    'expected one incoming friend request'
  );

  // Nothing in the seed should be able to log in except the demo account.
  const usable = data.users.filter((u) => u.email === DEMO_EMAIL);
  assert.equal(usable.length, 1);
});

test('seeding twice does not duplicate or overwrite anything', () => {
  const before = JSON.stringify(data);
  const second = seedDemoData();

  assert.equal(second.seeded, false);
  assert.match(second.reason, /already has users/);
  assert.equal(JSON.stringify(data), before);
});

test('the demo account can log in and sees a populated feed', async () => {
  const token = await loginAsDemo();

  const feed = await request(app).get('/api/posts').set(auth(token)).expect(200);

  assert.ok(feed.body.length >= 5);
  assert.ok(feed.body.every((post) => post.author && post.author.name));
  assert.ok(feed.body.some((post) => post.comments.length > 0), 'expected a commented post');
  assert.ok(feed.body.some((post) => post.likeCount > 0), 'expected a liked post');

  // The feed must show friends' posts, not strangers' — every author should be
  // the demo user or an accepted friend.
  const friendIds = new Set(
    data.friendships
      .filter((f) => f.status === 'accepted')
      .map((f) => (f.fromId === 1 ? f.toId : f.fromId))
  );
  friendIds.add(1);
  assert.ok(feed.body.every((post) => friendIds.has(post.author.id)));
});

test('the demo account has friends, a pending request and chat history', async () => {
  const token = await loginAsDemo();

  const friends = await request(app).get('/api/friends').set(auth(token)).expect(200);
  assert.ok(friends.body.length >= 2);

  const requests = await request(app).get('/api/friends/requests').set(auth(token)).expect(200);
  assert.equal(requests.body.length, 1);
  assert.equal(requests.body[0].name, 'Zanele Khumalo');

  const conversations = await request(app)
    .get('/api/chat/conversations')
    .set(auth(token))
    .expect(200);

  assert.ok(conversations.body.length >= 2);
  assert.ok(conversations.body.every((convo) => convo.lastMessage));
});

test('the demo account can post, like and comment like a real user', async () => {
  const token = await loginAsDemo();

  const created = await request(app)
    .post('/api/posts')
    .set(auth(token))
    .send({ content: 'Testing the demo account from the test suite.' })
    .expect(201);

  const liked = await request(app)
    .post(`/api/posts/${created.body.id}/like`)
    .set(auth(token))
    .expect(200);
  assert.equal(liked.body.likedByMe, true);

  const commented = await request(app)
    .post(`/api/posts/${created.body.id}/comment`)
    .set(auth(token))
    .send({ content: 'And commenting on it.' })
    .expect(201);
  assert.equal(commented.body.comments.length, 1);
});
