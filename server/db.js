const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const DEFAULT_DATA = {
  users: [],
  posts: [],
  comments: [],
  likes: [],
  friendships: [],
  messages: []
};

let data = load();
let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('DB read error:', e.message);
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(save, 150);
}

function getId(collection) {
  const max = data[collection].reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  return max + 1;
}

module.exports = { data, save, scheduleSave, getId, DB_FILE };