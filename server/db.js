'use strict';

/**
 * The data layer, such as it is: one JSON file, loaded once, written on a
 * debounce.
 *
 * This is deliberate for a learning project — it keeps the storage mechanics
 * visible. It is also the first thing that has to go for anything real, hence
 * the Postgres migration on the roadmap.
 *
 * Two things here are non-negotiable even for a toy:
 *   - writes are atomic (temp file + rename), so a crash mid-write cannot
 *     leave a truncated file behind
 *   - the location is configurable, so tests and containers do not scribble
 *     into the source tree
 */

const fs = require('fs');
const path = require('path');
const config = require('./config');

const DATA_DIR = config.dataDir;
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DATA = {
  users: [],
  posts: [],
  comments: [],
  likes: [],
  friendships: [],
  messages: [],
};

let data = load();
let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      // A file written by an older version could be missing a collection.
      return { ...JSON.parse(JSON.stringify(DEFAULT_DATA)), ...parsed };
    }
  } catch (err) {
    console.error('DB read error:', err.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = null;

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, DB_FILE);
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      save();
    } catch (err) {
      console.error('DB write error:', err.message);
    }
  }, 150);
  // Do not hold the process open just for a pending write.
  if (typeof saveTimer.unref === 'function') saveTimer.unref();
}

/** Force a pending write to disk now. Used during graceful shutdown. */
function flush() {
  save();
}

/** Readiness probe: can we actually persist right now? */
function isWritable() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const probe = path.join(DATA_DIR, '.write-probe');
    fs.writeFileSync(probe, String(Date.now()));
    fs.unlinkSync(probe);
    return true;
  } catch (err) {
    return false;
  }
}

function getId(collection) {
  const rows = data[collection] || [];
  const max = rows.reduce((highest, row) => Math.max(highest, Number(row.id) || 0), 0);
  return max + 1;
}

module.exports = { data, save, flush, scheduleSave, isWritable, getId, DB_FILE, DATA_DIR };
