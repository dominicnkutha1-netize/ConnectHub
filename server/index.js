const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const SECRET = require('./secret');
const { data, scheduleSave, getId } = require('./db');
const { authenticate } = require('./auth');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const friendRoutes = require('./routes/friends');
const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/uploads');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/users/me/photo', authenticate, uploadRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/posts', authenticate, postRoutes);
app.use('/api/friends', authenticate, friendRoutes);
app.use('/api/chat', authenticate, chatRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.use((socket, next) => {
  const token = (socket.handshake.auth || {}).token;
  if (!token) return next(new Error('Not authorized'));
  try {
    const payload = jwt.verify(token, SECRET);
    socket.userId = payload.id;
    next();
  } catch (e) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', socket => {
  socket.join('user_' + socket.userId);

  socket.on('chat:send', ({ toId, content } = {}) => {
    const fromId = socket.userId;
    const text = String(content || '').trim().slice(0, 2000);
    if (!text || !Number(toId)) return;
    const sender = data.users.find(u => u.id === fromId);
    if (!sender) return;
    const message = { id: getId('messages'), fromId, toId: Number(toId), content: text, createdAt: Date.now() };
    data.messages.push(message);
    scheduleSave();
    io.to('user_' + message.toId).emit('chat:receive', message);
    io.to('user_' + fromId).emit('chat:sent', message);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`ConnectHub server running on http://localhost:${PORT}`);
});