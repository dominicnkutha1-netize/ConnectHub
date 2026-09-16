const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { data, scheduleSave } = require('../db');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, '_'))
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

router.post('/photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const user = data.users.find(u => u.id === req.userId);
  const photo = '/uploads/' + req.file.filename;
  if (user) {
    user.photo = photo;
    scheduleSave();
  }
  res.json({ photo });
});

module.exports = router;