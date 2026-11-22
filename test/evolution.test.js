'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EvolutionClient, EvolutionError } = require('../src/evolution');
const { startFakeEvolution } = require('./helpers');
const { loadConfig } = require('../src/config');

test('config recusa host que não é loopback', () => {
  assert.throws(() => loadConfig({ EVOLUTION_API_URL: 'http://10.0.0.5:8080', EVOLUTION_API_KEY: 'x' }), /loopback/);
});

test('config aceita 127.0.0.1 e lê a chave do ambiente sem expô-la', () => {
  const cfg = loadConfig({ EVOLUTION_API_URL: 'http://127.0.0.1:8080', EVOLUTION_API_KEY: 'segredo' });
  assert.equal(cfg.baseUrl, 'http://127.0.0.1:8080');
  assert.equal(cfg.apiKey, 'segredo');
  assert.equal(cfg.realSendEnabled, false, 'envio real desligado por padrão');
  assert.ok(cfg.minGapSeconds >= 60, 'pausa mínima de 60 s');
});

test('cliente envia apikey e lista grupos', async () => {
  const fake = await startFakeEvolution({
    groups: [{ id: 'g1@g.us', subject: 'Turma A', size: 2, participants: [{ id: 'a@s.whatsapp.net' }, { id: 'b@s.whatsapp.net' }] }],
  });
  try {
    const c = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const groups = await c.fetchGroups('whatsapp-report');
    assert.equal(groups.length, 1);
    assert.equal(groups[0].subject, 'Turma A');
  } finally {
    await fake.close();
  }
});

test('chave errada gera erro sem ecoar a chave', async () => {
  const fake = await startFakeEvolution({ apiKey: 'certa' });
  try {
    const c = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: 'errada' });
    await assert.rejects(c.fetchGroups('x'), (err) => {
      assert.ok(err instanceof EvolutionError);
      assert.equal(err.status, 401);
      assert.ok(!err.message.includes('errada'));
      return true;
    });
  } finally {
    await fake.close();
  }
});

test('findMessages lê messages.records e respeita paginação', async () => {
  const jid = 'g1@g.us';
  const records = Array.from({ length: 5 }, (_, i) => ({ key: { id: `m${i}`, remoteJid: jid }, messageTimestamp: 1000 + i }));
  const fake = await startFakeEvolution({ messagesByJid: { [jid]: records } });
  try {
    const c = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const p1 = await c.findMessages('whatsapp-report', jid, { page: 1, offset: 3 });
    const p2 = await c.findMessages('whatsapp-report', jid, { page: 2, offset: 3 });
    assert.equal(p1.length, 3);
    assert.equal(p2.length, 2);
  } finally {
    await fake.close();
  }
});
