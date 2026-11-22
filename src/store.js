// Armazenamento local (JSON, em data/, fora do git).
// Privacidade: não guarda texto de mensagens. Remetentes e participantes entram como
// pseudônimo HMAC-SHA256 com um salt local (data/.salt, modo 600).
// Escrita atômica (arquivo temporário + rename) e permissões 600.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_FILE = 'store.json';
const SALT_FILE = '.salt';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

function getSalt(dir) {
  ensureDir(dir);
  const file = path.join(dir, SALT_FILE);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
  }
  return fs.readFileSync(file, 'utf8').trim();
}

function pseudonymize(salt, jid) {
  return crypto.createHmac('sha256', salt).update(String(jid)).digest('hex').slice(0, 16);
}

function emptyStore() {
  return { version: 1, groups: {}, messages: {}, snapshots: {}, recipientsLedger: [] };
}

function loadStore(dir) {
  const file = path.join(dir, DB_FILE);
  if (!fs.existsSync(file)) return emptyStore();
  return { ...emptyStore(), ...JSON.parse(fs.readFileSync(file, 'utf8')) };
}

function saveStore(dir, store) {
  ensureDir(dir);
  const file = path.join(dir, DB_FILE);
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function loadConfigFile(dir) {
  const file = path.join(dir, 'config.json');
  if (!fs.existsSync(file)) return { groups: [], recipients: [] };
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function saveConfigFile(dir, config) {
  ensureDir(dir);
  const file = path.join(dir, 'config.json');
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}

module.exports = {
  getSalt,
  pseudonymize,
  loadStore,
  saveStore,
  loadConfigFile,
  saveConfigFile,
  emptyStore,
};
