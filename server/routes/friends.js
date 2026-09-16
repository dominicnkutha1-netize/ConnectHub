const express = require('express');
const { data, scheduleSave, getId } = require('../db');

const router = express.Router();

function userView(u) {
  if (!u) return null;
  return { id: u.id, name: u.name, photo: u.photo, bio: u.bio };
}

function friendshipBetween(a, b) {
  return data.friendships.find(
    f => (f.fromId === a && f.toId === b) || (f.fromId === b && f.toId === a)
  );
}

router.get('/', (req, res) => {
  const accepted = data.friendships.filter(
    f => f.status === 'accepted' && (f.fromId === req.userId || f.toId === req.userId)
  );
  const ids = accepted.map(f => (f.fromId === req.userId ? f.toId : f.fromId));
  res.json(data.users.filter(u => ids.includes(u.id)).map(userView));
});

router.get('/requests', (req, res) => {
  const incoming = data.friendships.filter(f => f.status === 'pending' && f.toId === req.userId);
  res.json(incoming.map(f => userView(data.users.find(u => u.id === f.fromId))).filter(Boolean));
});

router.get('/suggestions', (req, res) => {
  const others = data.users.filter(u => u.id !== req.userId);
  res.json(others.map(u => {
    const rel = friendshipBetween(req.userId, u.id);
    if (rel) return { ...userView(u), status: rel.status === 'accepted' ? 'Friends' : rel.fromId === req.userId ? 'Request sent' : 'Pending request' };
    return userView(u);
  }));
});

router.post('/:id/request', (req, res) => {
  const targetId = Number(req.params.id);
  if (targetId === req.userId) return res.status(400).json({ error: 'You cannot add yourself' });
  if (!data.users.find(u => u.id === targetId)) return res.status(404).json({ error: 'User not found' });
  if (friendshipBetween(req.userId, targetId)) return res.status(400).json({ error: 'Already friends or request pending' });
  data.friendships.push({
    id: getId('friendships'),
    fromId: req.userId,
    toId: targetId,
    status: 'pending',
    createdAt: Date.now()
  });
  scheduleSave();
  res.json({ ok: true });
});

router.post('/:id/accept', (req, res) => {
  const targetId = Number(req.params.id);
  const rel = data.friendships.find(f => f.fromId === targetId && f.toId === req.userId && f.status === 'pending');
  if (!rel) return res.status(404).json({ error: 'No pending request from this user' });
  rel.status = 'accepted';
  scheduleSave();
  res.json({ ok: true });
});

router.post('/:id/decline', (req, res) => {
  const targetId = Number(req.params.id);
  data.friendships = data.friendships.filter(
    f => !(f.fromId === targetId && f.toId === req.userId && f.status === 'pending')
  );
  scheduleSave();
  res.json({ ok: true });
});

router.post('/:id/unfriend', (req, res) => {
  const targetId = Number(req.params.id);
  data.friendships = data.friendships.filter(
    f => !(f.status === 'accepted' &&
      ((f.fromId === req.userId && f.toId === targetId) || (f.fromId === targetId && f.toId === req.userId)))
  );
  scheduleSave();
  res.json({ ok: true });
});

module.exports = router;