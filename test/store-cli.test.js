'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../src/store');
const { parseArgs } = require('../src/cli');

test('store grava com permissão 600 e relê o conteúdo', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-store-'));
  try {
    const s = store.emptyStore();
    s.groups['g1@g.us'] = { name: 'Turma' };
    store.saveStore(dir, s);
    const mode = fs.statSync(path.join(dir, 'store.json')).mode & 0o777;
    assert.equal(mode, 0o600);
    assert.equal(store.loadStore(dir).groups['g1@g.us'].name, 'Turma');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('salt é criado uma vez, com permissão 600, e pseudonimiza de forma estável', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-salt-'));
  try {
    const a = store.getSalt(dir);
    const b = store.getSalt(dir);
    assert.equal(a, b);
    assert.equal(fs.statSync(path.join(dir, '.salt')).mode & 0o777, 0o600);
    assert.equal(store.pseudonymize(a, 'x@s.whatsapp.net'), store.pseudonymize(b, 'x@s.whatsapp.net'));
    assert.notEqual(store.pseudonymize(a, 'x@s.whatsapp.net'), store.pseudonymize(a, 'y@s.whatsapp.net'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('config de grupos e destinatários persiste sem perder dados', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-cfg-'));
  try {
    assert.deepEqual(store.loadConfigFile(dir), { groups: [], recipients: [] });
    store.saveConfigFile(dir, { groups: [{ jid: 'g@g.us', name: 'G' }], recipients: [] });
    assert.equal(store.loadConfigFile(dir).groups[0].name, 'G');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('parseArgs separa comando e opções', () => {
  const { command, opts } = parseArgs(['send-x', '--id', 'r1', '--real', '--days', '3']);
  assert.equal(command, 'send-x');
  assert.equal(opts.id, 'r1');
  assert.equal(opts.real, true);
  assert.equal(opts.days, '3');
});
