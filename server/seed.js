'use strict';

/**
 * Demo seed for the public deployment.
 *
 * The host this runs on (Render's free tier) has an ephemeral filesystem: every
 * spin-down wipes the JSON store. A visitor who arrives after a cold start
 * should still find a populated feed, not an empty one, so the seed runs on
 * every boot instead of once.
 *
 * It is deliberately conservative:
 *   - it does nothing unless SEED_DEMO is set
 *   - it only runs against an empty store, so it can never overwrite real data
 *   - it writes synchronously, so the data is on disk before the port opens
 *
 * The demo credentials are public by design. They are printed at boot and
 * documented in the README; nothing sensitive lives in this file.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const config = require('./config');
const { data, save, getId } = require('./db');

const DEMO_EMAIL = 'demo@connecthub.dev';
const DEMO_PASSWORD = 'connecthub-demo';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const PEOPLE = [
  {
    name: 'Demo Visitor',
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    bio: 'Shared demo account. Look around, break something, it resets.',
  },
  {
    name: 'Naledi Mokoena',
    email: 'naledi@connecthub.dev',
    bio: 'Backend engineer. Postgres, queues, and arguing about indexes.',
  },
  {
    name: 'Thabo Mahlangu',
    email: 'thabo@connecthub.dev',
    bio: 'Cloud engineer in training. Terraform, containers, too much coffee.',
  },
  {
    name: 'Zanele Khumalo',
    email: 'zanele@connecthub.dev',
    bio: 'Frontend developer. React, accessibility, and the details nobody notices until they do.',
  },
];

function addUser({ name, email, bio, password }) {
  // Only the demo account gets a usable password. The others are real people
  // as far as the app is concerned, but nobody can log in as them.
  const secret = password || crypto.randomBytes(24).toString('hex');
  const user = {
    id: getId('users'),
    name,
    email,
    password: bcrypt.hashSync(secret, 10),
    bio,
    photo: '',
    createdAt: Date.now() - 120 * DAY,
  };
  data.users.push(user);
  return user;
}

function addPost(userId, content, createdAt) {
  const post = { id: getId('posts'), userId, content, createdAt };
  data.posts.push(post);
  return post;
}

function addComment(postId, userId, content, createdAt) {
  const comment = { id: getId('comments'), postId, userId, content, createdAt };
  data.comments.push(comment);
  return comment;
}

function addLike(postId, userId) {
  const like = { id: getId('likes'), postId, userId, createdAt: Date.now() };
  data.likes.push(like);
  return like;
}

function addFriendship(fromId, toId, status, createdAt) {
  const friendship = { id: getId('friendships'), fromId, toId, status, createdAt };
  data.friendships.push(friendship);
  return friendship;
}

function addMessage(fromId, toId, content, createdAt) {
  const message = { id: getId('messages'), fromId, toId, content, createdAt };
  data.messages.push(message);
  return message;
}

/**
 * Populate an empty store with a small, believable network.
 *
 * Returns a description of what happened rather than logging directly, so the
 * caller decides what to do with it and tests can assert on it.
 */
function seedDemoData() {
  if (!config.seedDemo) {
    return { seeded: false, reason: 'SEED_DEMO is not set' };
  }

  if (data.users.length > 0) {
    return { seeded: false, reason: 'store already has users' };
  }

  const now = Date.now();

  const [demo, naledi, thabo, zanele] = PEOPLE.map(addUser);

  // --- Posts ---------------------------------------------------------------
  const postgres = addPost(
    naledi.id,
    "Replaced our JSON file store with Postgres over the weekend. The migration itself took an hour. Convincing myself the data still matched took two days.",
    now - 3 * DAY
  );

  const ups = addPost(
    thabo.id,
    "Load shedding took the staging box down at 19:02. Turns out the UPS only covers the router. The runbook now has a section called \"what is actually plugged in\".",
    now - 2 * DAY - 5 * HOUR
  );

  const labels = addPost(
    zanele.id,
    "Accessibility fix of the week: every input on the sign-up form now has a real label element. Twenty minutes of work. The person who reported it had been guessing which box was the password field.",
    now - 2 * DAY + 2 * HOUR
  );

  const probes = addPost(
    naledi.id,
    "Liveness asks \"is this process alive\". Readiness asks \"should this process get traffic\". Putting both behind one endpoint is how you get a restart loop during a database blip.",
    now - 26 * HOUR
  );

  const binding = addPost(
    thabo.id,
    "An hour debugging \"connection refused\" that turned out to be the container listening on 127.0.0.1 instead of 0.0.0.0. Every single time.",
    now - 9 * HOUR
  );

  const ci = addPost(
    zanele.id,
    "A 40-line CI file has caught more bugs for me this year than any linter. It is the cheapest code review you will ever get.",
    now - 4 * HOUR
  );

  addPost(
    demo.id,
    "This is the shared demo account for ConnectHub. The feed, likes, comments and chat are all real requests against the API — nothing here is hard-coded in the client.",
    now - 3 * HOUR
  );

  // --- Comments ------------------------------------------------------------
  addComment(postgres.id, thabo.id, "pg_dump before, row counts after, then eyeball a sample. Boring and it works.", now - 3 * DAY + 40 * MINUTE);
  addComment(postgres.id, demo.id, "What finally pushed you to migrate?", now - 3 * DAY + 90 * MINUTE);
  addComment(labels.id, naledi.id, "The 20-minute fixes are always the ones that matter most.", now - 2 * DAY + 3 * HOUR);
  addComment(probes.id, demo.id, "This is the part that took me longest to get right.", now - 25 * HOUR);
  addComment(binding.id, zanele.id, "I have made this exact mistake in three different languages.", now - 8 * HOUR);

  // --- Likes ---------------------------------------------------------------
  [demo, thabo, zanele].forEach((user) => addLike(postgres.id, user.id));
  [demo, naledi].forEach((user) => addLike(ups.id, user.id));
  [demo, naledi, thabo].forEach((user) => addLike(labels.id, user.id));
  [demo, thabo].forEach((user) => addLike(probes.id, user.id));
  [naledi].forEach((user) => addLike(binding.id, user.id));
  [demo, naledi, thabo].forEach((user) => addLike(ci.id, user.id));

  // --- Friendships ---------------------------------------------------------
  addFriendship(demo.id, naledi.id, 'accepted', now - 20 * DAY);
  addFriendship(demo.id, thabo.id, 'accepted', now - 14 * DAY);
  // One incoming request, so the friend-request screen is not empty either.
  addFriendship(zanele.id, demo.id, 'pending', now - 2 * DAY);

  // --- Chat ----------------------------------------------------------------
  addMessage(demo.id, naledi.id, "Is the demo still working after the last deploy?", now - 12 * HOUR);
  addMessage(naledi.id, demo.id, "Just checked. Feed loads, chat reconnects cleanly.", now - 11 * HOUR - 50 * MINUTE);
  addMessage(demo.id, naledi.id, "Good. The free instance wipes its disk when it sleeps, so it re-seeds itself on boot.", now - 11 * HOUR);

  addMessage(thabo.id, demo.id, "Did you get the readiness probe working?", now - 3 * HOUR);
  addMessage(demo.id, thabo.id, "Yes. It writes a probe file, so it fails if the volume is read-only.", now - 2 * HOUR - 55 * MINUTE);

  // Write now rather than debouncing: the process is about to start accepting
  // traffic and a visitor should never see a half-empty store.
  save();

  return {
    seeded: true,
    credentials: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    counts: {
      users: data.users.length,
      posts: data.posts.length,
      comments: data.comments.length,
      likes: data.likes.length,
      friendships: data.friendships.length,
      messages: data.messages.length,
    },
  };
}

module.exports = { seedDemoData, DEMO_EMAIL, DEMO_PASSWORD };
