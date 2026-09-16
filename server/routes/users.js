const express = require('express');
const { data, scheduleSave } = require('../db');

const router = express.Router();

router.get('/me', (req, res) => {
  const user = data.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, email: user.email, bio: user.bio, photo: user.photo, createdAt: user.createdAt });
});

router.get('/:id', (req, res) => {
  const user = data.users.find(u => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, name: user.name, bio: user.bio, photo: user.photo, createdAt: user.createdAt });
});

router.put('/me', (req, res) => {
  const user = data.users.find(u => u.id === req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (typeof req.body.name === 'string' && req.body.name.trim()) user.name = req.body.name.trim().slice(0, 100);
  if (typeof req.body.bio === 'string') user.bio = req.body.bio.slice(0, 300);
  if (typeof req.body.photo === 'string') user.photo = req.body.photo.slice(0, 500);
  scheduleSave();
  res.json({ id: user.id, name: user.name, email: user.email, bio: user.bio, photo: user.photo, createdAt: user.createdAt });
});

module.exports = router;