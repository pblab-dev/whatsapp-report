'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMessage, collectGroup } = require('../src/collect');
const { EvolutionClient } = require('../src/evolution');
const { startFakeEvolution, NOW, DAY } = require('./helpers');
const { emptyStore, pseudonymize } = require('../src/store');

const SALT = 'salt-de-teste';
const JID = 'g1@g.us';

test('normalizeMessage remove conteúdo e pseudonimiza o remetente', () => {
  const m = normalizeMessage(
    { key: { id: 'X1', remoteJid: JID, participant: '5585999990000@s.whatsapp.net', fromMe: false }, messageType: 'conversation', messageTimestamp: 123, message: { conversation: 'segredo do grupo' } },
    SALT,
  );
  assert.deepEqual(Object.keys(m).sort(), ['fromMe', 'id', 'sender', 'ts', 'type']);
  assert.equal(m.sender, pseudonymize(SALT, '5585999990000@s.whatsapp.net'));
  assert.ok(!JSON.stringify(m).includes('5585999990000'));
  assert.ok(!JSON.stringify(m).includes('segredo'));
});

test('normalizeMessage descarta registros sem id ou timestamp', () => {
  assert.equal(normalizeMessage({ key: { remoteJid: JID } , messageTimestamp: 1 }, SALT), null);
  assert.equal(normalizeMessage({ key: { id: 'a', remoteJid: JID }, messageTimestamp: 'x' }, SALT), null);
});

test('collectGroup pagina até o início do período, deduplica e grava snapshot', async () => {
  const mk = (i, ts) => ({ key: { id: `m${i}`, remoteJid: JID, participant: `p${i % 3}@s.whatsapp.net` }, messageTimestamp: ts, messageType: 'conversation' });
  const recent = Array.from({ length: 250 }, (_, i) => mk(i, NOW - i * 60));
  const old = [mk(999, NOW - 60 * DAY)];
  const fake = await startFakeEvolution({ messagesByJid: { [JID]: [...recent, ...old] } });
  try {
    const client = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const store = emptyStore();
    const meta = { id: JID, subject: 'Turma', participants: [{ id: 'p0@s.whatsapp.net' }, { id: 'p1@s.whatsapp.net' }] };
    const first = await collectGroup({ client, instance: 'whatsapp-report', store, salt: SALT, groupJid: JID, groupMeta: meta, nowSec: NOW });
    assert.equal(first.newMessages, 250, 'coleta as 250 recentes e ignora a antiga');
    assert.equal(first.snapshotChanged, true);
    assert.equal(store.groups[JID].name, 'Turma');

    const second = await collectGroup({ client, instance: 'whatsapp-report', store, salt: SALT, groupJid: JID, groupMeta: meta, nowSec: NOW + 60 });
    assert.equal(second.newMessages, 0, 'segunda coleta não duplica');
    assert.equal(second.snapshotChanged, false, 'mesma lista de membros não gera snapshot novo');
    assert.equal(store.snapshots[JID].length, 1);
  } finally {
    await fake.close();
  }
});
