'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { makeClient, register } = require('./helpers');

const { app, request } = makeClient();

const auth = (token) => ({ Authorization: `Bearer ${token}` });

test('a user can create a post and see it in their own feed', async () => {
  const { token } = await register(request, app);

  const created = await request(app)
    .post('/api/posts')
    .set(auth(token))
    .send({ content: 'First post from a test' })
    .expect(201);

  assert.equal(created.body.content, 'First post from a test');
  assert.equal(created.body.likeCount, 0);

  const feed = await request(app).get('/api/posts').set(auth(token)).expect(200);
  assert.equal(feed.body.length, 1);
  assert.equal(feed.body[0].id, created.body.id);
});

test('empty posts are rejected', async () => {
  const { token } = await register(request, app);
  await request(app).post('/api/posts').set(auth(token)).send({ content: '   ' }).expect(400);
});

test('liking toggles the like count and likedByMe flag', async () => {
  const { token } = await register(request, app);
  const post = await request(app).post('/api/posts').set(auth(token)).send({ content: 'Like me' }).expect(201);

  const liked = await request(app).post(`/api/posts/${post.body.id}/like`).set(auth(token)).expect(200);
  assert.equal(liked.body.likeCount, 1);
  assert.equal(liked.body.likedByMe, true);

  const unliked = await request(app).post(`/api/posts/${post.body.id}/like`).set(auth(token)).expect(200);
  assert.equal(unliked.body.likeCount, 0);
  assert.equal(unliked.body.likedByMe, false);
});

test('comments are attached to the post', async () => {
  const { token } = await register(request, app);
  const post = await request(app).post('/api/posts').set(auth(token)).send({ content: 'Comment here' }).expect(201);

  const res = await request(app)
    .post(`/api/posts/${post.body.id}/comment`)
    .set(auth(token))
    .send({ content: 'Nice post' })
    .expect(201);

  assert.equal(res.body.comments.length, 1);
  assert.equal(res.body.comments[0].content, 'Nice post');
});

test('commenting on a missing post returns 404', async () => {
  const { token } = await register(request, app);
  await request(app).post('/api/posts/999999/comment').set(auth(token)).send({ content: 'hi' }).expect(404);
});

test('one user cannot delete another user\'s post', async () => {
  const author = await register(request, app);
  const stranger = await register(request, app);

  const post = await request(app).post('/api/posts').set(auth(author.token)).send({ content: 'Mine' }).expect(201);

  const res = await request(app).delete(`/api/posts/${post.body.id}`).set(auth(stranger.token)).expect(403);
  assert.match(res.body.error, /only delete your own/i);
});

test('an author can delete their post and its likes and comments go with it', async () => {
  const { token } = await register(request, app);
  const post = await request(app).post('/api/posts').set(auth(token)).send({ content: 'Temporary' }).expect(201);
  await request(app).post(`/api/posts/${post.body.id}/like`).set(auth(token));
  await request(app).post(`/api/posts/${post.body.id}/comment`).set(auth(token)).send({ content: 'bye' });

  await request(app).delete(`/api/posts/${post.body.id}`).set(auth(token)).expect(200);

  const feed = await request(app).get('/api/posts').set(auth(token)).expect(200);
  assert.equal(feed.body.some((p) => p.id === post.body.id), false);
});

test('the feed does not include posts from strangers', async () => {
  const me = await register(request, app);
  const stranger = await register(request, app);

  await request(app).post('/api/posts').set(auth(stranger.token)).send({ content: 'Not for you' }).expect(201);

  const feed = await request(app).get('/api/posts').set(auth(me.token)).expect(200);
  assert.equal(feed.body.length, 0);
});
