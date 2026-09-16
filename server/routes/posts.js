const express = require('express');
const { data, scheduleSave, getId } = require('../db');

const router = express.Router();

function postView(post, viewerId) {
  const author = data.users.find(u => u.id === post.userId);
  const likes = data.likes.filter(l => l.postId === post.id);
  const comments = data.comments
    .filter(c => c.postId === post.id)
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(c => ({ id: c.id, content: c.content, createdAt: c.createdAt, user: (data.users.find(u => u.id === c.userId) || {}).name || 'Unknown' }));
  return {
    id: post.id,
    content: post.content,
    createdAt: post.createdAt,
    author: author ? { id: author.id, name: author.name, photo: author.photo } : null,
    likeCount: likes.length,
    likedByMe: likes.some(l => l.userId === viewerId),
    comments
  };
}

router.get('/', (req, res) => {
  const friendIds = new Set(
    data.friendships
      .filter(f => f.status === 'accepted' && (f.fromId === req.userId || f.toId === req.userId))
      .map(f => (f.fromId === req.userId ? f.toId : f.fromId))
  );
  friendIds.add(req.userId);
  const posts = data.posts
    .filter(p => friendIds.has(p.userId))
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(posts.map(p => postView(p, req.userId)));
});

router.get('/user/:id', (req, res) => {
  const id = Number(req.params.id);
  const posts = data.posts
    .filter(p => p.userId === id)
    .sort((a, b) => b.createdAt - a.createdAt);
  res.json(posts.map(p => postView(p, req.userId)));
});

router.post('/', (req, res) => {
  const content = (req.body || {}).content;
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Post content is required' });
  }
  const post = {
    id: getId('posts'),
    userId: req.userId,
    content: String(content).trim().slice(0, 5000),
    createdAt: Date.now()
  };
  data.posts.push(post);
  scheduleSave();
  res.status(201).json(postView(post, req.userId));
});

router.post('/:id/like', (req, res) => {
  const postId = Number(req.params.id);
  const post = data.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  const existing = data.likes.find(l => l.postId === postId && l.userId === req.userId);
  if (existing) {
    data.likes = data.likes.filter(l => l !== existing);
  } else {
    data.likes.push({ id: getId('likes'), postId, userId: req.userId, createdAt: Date.now() });
  }
  scheduleSave();
  res.json(postView(post, req.userId));
});

router.post('/:id/comment', (req, res) => {
  const postId = Number(req.params.id);
  const content = (req.body || {}).content;
  const post = data.posts.find(p => p.id === postId);
  if (!post) return res.status(404).json({ error: 'Post not found' });
  if (!content || !String(content).trim()) {
    return res.status(400).json({ error: 'Comment is required' });
  }
  const comment = {
    id: getId('comments'),
    postId,
    userId: req.userId,
    content: String(content).trim().slice(0, 2000),
    createdAt: Date.now()
  };
  data.comments.push(comment);
  scheduleSave();
  res.status(201).json(postView(post, req.userId));
});

router.delete('/:id', (req, res) => {
  const postId = Number(req.params.id);
  const idx = data.posts.findIndex(p => p.id === postId);
  if (idx === -1) return res.status(404).json({ error: 'Post not found' });
  if (data.posts[idx].userId !== req.userId) {
    return res.status(403).json({ error: 'You can only delete your own posts' });
  }
  data.posts.splice(idx, 1);
  data.likes = data.likes.filter(l => l.postId !== postId);
  data.comments = data.comments.filter(c => c.postId !== postId);
  scheduleSave();
  res.json({ ok: true });
});

module.exports = router;