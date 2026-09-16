# ConnectHub

A full-stack social network inspired by Facebook — login/register, profiles with photo uploads, a news feed with posts, likes & comments, a friendship system, and real-time 1-on-1 chat.

Built with **React** (Vite), **Node.js** (Express), **Socket.IO** for real-time chat, and **JWT** + **bcrypt** for authentication. Data persists to a local JSON store — no external database or cloud needed.

## Features
- 🔐 **Auth** — sign up, log in (JWT + bcrypt password hashing)
- 👤 **Profiles** — editable name, bio, and profile photo (multer file upload)
- 📰 **News feed** — create posts; feed shows your friends' posts
- 👍 **Likes** — like/unlike posts in real time
- 💬 **Comments** — comment on posts
- 🤝 **Friends** — send/accept/decline requests, suggestions, unfriend
- ⚡ **Chat** — real-time one-on-one messaging via Socket.IO

## Getting started

### 1. Server (port 4000)
```bash
cd server
npm install
npm start
```

### 2. Client (port 3000)
```bash
cd client
npm install
npm run dev
```

Open `http://localhost:3000`, create an account, and open a second browser (private window) with another account to test friends + chat.

## Project structure
```
ConnectHub/
├── server/              # Express + Socket.IO backend
│   ├── index.js         # HTTP + socket server, REST routes
│   ├── db.js            # JSON-persisted data store
│   ├── auth.js          # JWT middleware
│   ├── secret.js        # Auto-generated dev secret (git-ignored)
│   └── routes/          # auth, users, posts, friends, chat, uploads
└── client/              # React + Vite frontend
    └── src/
        ├── api.js       # API + token helpers
        ├── pages/       # Login, Register, Feed, Profile, Friends, Chat
        ├── components/  # Navbar, PostCard, Avatar
        └── App.jsx      # Auth context + routing
```

## License
[MIT](LICENSE) © 2026 Dominic Nkutha-Netize (dominicnkutha1-netize)