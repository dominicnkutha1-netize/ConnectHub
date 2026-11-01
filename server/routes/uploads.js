'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');
const { data, scheduleSave } = require('../db');

const router = express.Router();

const uploadDir = config.uploadsDir;
fs.mkdirSync(uploadDir, { recursive: true });

function reject(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Never trust the client's filename: strip everything but safe characters
    // and add randomness so two uploads cannot overwrite each other.
    const safe = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_').slice(-60);
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) return cb(null, true);
    // Attach a status so the error handler returns 400 rather than 500.
    return cb(reject(400, 'Only image files are allowed'));
  },
});

// Mounted at /api/users/me/photo, so the route path is '/'.
router.post('/', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const user = data.users.find((u) => u.id === req.userId);
  const photo = `/uploads/${req.file.filename}`;
  if (user) {
    user.photo = photo;
    scheduleSave();
  }
  return res.json({ photo });
});

module.exports = router;
