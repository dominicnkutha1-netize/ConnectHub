const express = require('express');
const { data } = require('../db');

const router = express.Router();

router.get('/with/:id', (req, res) => {
  const otherId = Number(req.params.id);
  const messages = data.messages
    .filter(m =>
      (m.fromId === req.userId && m.toId === otherId) ||
      (m.fromId === otherId && m.toId === req.userId)
    )
    .sort((a, b) => a.createdAt - b.createdAt);
  res.json(messages);
});

router.get('/conversations', (req, res) => {
  const mine = data.messages.filter(m => m.fromId === req.userId || m.toId === req.userId);
  const partnerIds = new Set();
  mine.forEach(m => partnerIds.add(m.fromId === req.userId ? m.toId : m.fromId));
  const convos = [...partnerIds].map(id => {
    const user = data.users.find(u => u.id === id);
    const withPartner = mine
      .filter(m => m.fromId === id || m.toId === id)
      .sort((a, b) => b.createdAt - a.createdAt);
    return {
      user: user ? { id: user.id, name: user.name, photo: user.photo } : null,
      lastMessage: withPartner[0] || null
    };
  })
    .filter(c => c.user)
    .sort((a, b) => ((b.lastMessage || {}).createdAt || 0) - ((a.lastMessage || {}).createdAt || 0));
  res.json(convos);
});

module.exports = router;