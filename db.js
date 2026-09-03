// ============================================================
//  Mini base de données JSON (aucune installation requise).
//  Chaque « table » est un fichier data/*.json.
// ============================================================
'use strict';
const fs = require('fs');
const path = require('path');
const config = require('./config');

const cache = {};

function file(name) {
  return path.join(config.dataDir, name + '.json');
}

function read(name) {
  if (cache[name]) return cache[name];
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file(name), 'utf8'));
  } catch (e) {
    data = [];
  }
  cache[name] = data;
  return data;
}

function write(name) {
  const d = cache[name];
  if (!d) return;
  fs.mkdirSync(path.dirname(file(name)), { recursive: true }); // crée data/ si absent
  const tmp = file(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 1), 'utf8');
  fs.renameSync(tmp, file(name));
}

function ensureFile(name) {
  fs.mkdirSync(path.dirname(file(name)), { recursive: true });
  if (!fs.existsSync(file(name))) write(name);
}

module.exports = {
  read,
  write,
  ensureFile,
  path: file
};
