const express = require('express');
const bcrypt = require('bcryptjs');
const { signToken } = require('../auth');
const { data, scheduleSave, getId } = require('../db');

const router = express.Router();

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, bio: u.bio, photo: u.photo, createdAt: u.createdAt };
}

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  const normalizedEmail = String(email).trim().toLowerCase();
  if (data.users.some(u => u.email === normalizedEmail)) {
    return res.status(409).json({ error: 'Email is already registered' });
  }
  const user = {
    id: getId('users'),
    name: String(name).trim().slice(0, 100),
    email: normalizedEmail,
    password: bcrypt.hashSync(String(password), 10),
    bio: '',
    photo: '',
    createdAt: Date.now()
  };
  data.users.push(user);
  scheduleSave();
  const token = signToken(user.id);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = data.users.find(u => u.email === String(email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(String(password || ''), user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const token = signToken(user.id);
  res.json({ token, user: publicUser(user) });
});

module.exports = router;