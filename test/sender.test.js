'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { dispatch, targetNumber } = require('../src/sender');
const { startFakeEvolution, baseConfig } = require('./helpers');
const { EvolutionClient } = require('../src/evolution');
const { emptyStore } = require('../src/store');

// 2026-11-22 21:00 America/Fortaleza = 2026-11-23T00:00Z
const NIGHT = Math.floor(Date.UTC(2026, 10, 23, 0, 0, 0) / 1000);
const approved = (over = {}) => ({
  id: 'r1',
  type: 'user',
  target: '5585999990000',
  approved: true,
  approval: { by: 'Dono', at: '2026-11-22T10:00:00Z' },
  ...over,
});
const text = () => '📊 *Relatório de teste*';
const noSleep = (calls) => async (ms) => calls.push(ms);

test('sem aprovação do dono: pula e não chama a Evolution', async () => {
  const fake = await startFakeEvolution();
  try {
    const client = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const store = emptyStore();
    const res = await dispatch({
      client, instance: 'whatsapp-report', config: baseConfig({ realSendEnabled: true }), store,
      recipients: [approved({ approved: false, approval: null })], buildText: text, nowSec: NIGHT, confirmReal: true,
    });
    assert.equal(res[0].status, 'skipped');
    assert.equal(res[0].reason, 'sem aprovação do dono');
    assert.equal(fake.calls.sends.length, 0);
  } finally {
    await fake.close();
  }
});

test('envio real desligado (padrão): simula e não chama a Evolution', async () => {
  const fake = await startFakeEvolution();
  try {
    const client = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const store = emptyStore();
    const res = await dispatch({
      client, instance: 'whatsapp-report', config: baseConfig({ realSendEnabled: false }), store,
      recipients: [approved()], buildText: text, nowSec: NIGHT, confirmReal: true,
    });
    assert.equal(res[0].status, 'simulated');
    assert.equal(fake.calls.sends.length, 0);
    assert.equal(store.recipientsLedger.length, 0, 'simulação não entra no teto diário');
  } finally {
    await fake.close();
  }
});

test('envio real só com variável ligada e confirmação explícita', async () => {
  const fake = await startFakeEvolution();
  try {
    const client = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const store = emptyStore();
    const cfg = baseConfig({ realSendEnabled: true });
    const noConfirm = await dispatch({ client, instance: 'whatsapp-report', config: cfg, store, recipients: [approved()], buildText: text, nowSec: NIGHT, confirmReal: false });
    assert.equal(noConfirm[0].status, 'simulated', 'sem --real não envia mesmo com variável ligada');
    const res = await dispatch({ client, instance: 'whatsapp-report', config: cfg, store, recipients: [approved()], buildText: text, nowSec: NIGHT, confirmReal: true });
    assert.equal(res[0].status, 'sent');
    assert.equal(fake.calls.sends.length, 1);
    assert.equal(fake.calls.sends[0].number, '5585999990000');
    assert.match(fake.calls.sends[0].text, /Relatório de teste/);
  } finally {
    await fake.close();
  }
});

test('limite de 1 relatório por dia: segundo envio no mesmo dia é bloqueado', async () => {
  const fake = await startFakeEvolution();
  try {
    const client = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const store = emptyStore();
    const cfg = baseConfig({ realSendEnabled: true });
    await dispatch({ client, instance: 'whatsapp-report', config: cfg, store, recipients: [approved()], buildText: text, nowSec: NIGHT, confirmReal: true });
    const again = await dispatch({ client, instance: 'whatsapp-report', config: cfg, store, recipients: [approved()], buildText: text, nowSec: NIGHT - 1800, confirmReal: true, sleep: noSleep([]) }); // 20h30 locais, mesmo dia
    assert.equal(again[0].status, 'skipped');
    assert.match(again[0].reason, /limite de 1/);
    assert.equal(fake.calls.sends.length, 1);
  } finally {
    await fake.close();
  }
});

test('fora da janela de envio (07h59 locais) não envia', async () => {
  const fake = await startFakeEvolution();
  try {
    const client = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const early = Math.floor(Date.UTC(2026, 10, 22, 10, 59, 0) / 1000); // 07:59 local
    const res = await dispatch({ client, instance: 'whatsapp-report', config: baseConfig({ realSendEnabled: true }), store: emptyStore(), recipients: [approved()], buildText: text, nowSec: early, confirmReal: true });
    assert.equal(res[0].status, 'skipped');
    assert.equal(res[0].reason, 'fora da janela de envio');
    assert.equal(fake.calls.sends.length, 0);
  } finally {
    await fake.close();
  }
});

test('pausa mínima entre destinatários no mesmo ciclo', async () => {
  const fake = await startFakeEvolution();
  try {
    const client = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const store = emptyStore();
    const waits = [];
    const cfg = baseConfig({ realSendEnabled: true, minGapSeconds: 90 });
    const res = await dispatch({
      client, instance: 'whatsapp-report', config: cfg, store,
      recipients: [approved({ id: 'r1' }), approved({ id: 'r2', target: '5585988880000' })],
      buildText: text, nowSec: NIGHT, confirmReal: true, sleep: noSleep(waits),
    });
    assert.deepEqual(res.map((r) => r.status), ['sent', 'sent']);
    assert.deepEqual(waits, [90000], 'espera 90 s antes do segundo envio');
  } finally {
    await fake.close();
  }
});

test('falha da Evolution vira status failed, sem derrubar o ciclo', async () => {
  const fake = await startFakeEvolution({ sendStatus: 500 });
  try {
    const client = new EvolutionClient({ baseUrl: fake.baseUrl, apiKey: fake.apiKey });
    const res = await dispatch({ client, instance: 'whatsapp-report', config: baseConfig({ realSendEnabled: true }), store: emptyStore(), recipients: [approved()], buildText: text, nowSec: NIGHT, confirmReal: true });
    assert.equal(res[0].status, 'failed');
  } finally {
    await fake.close();
  }
});

test('destino inválido é recusado antes de qualquer chamada', () => {
  assert.throws(() => targetNumber({ id: 'x', type: 'group', target: '123' }), /Destino de grupo inválido/);
  assert.throws(() => targetNumber({ id: 'x', type: 'user', target: '12' }), /Número inválido/);
  assert.equal(targetNumber({ id: 'g', type: 'group', target: '120363000000000000@g.us' }), '120363000000000000@g.us');
  assert.equal(targetNumber({ id: 'u', type: 'user', target: '+55 (85) 99999-0000' }), '5585999990000');
});

test('aprovação exige quem aprovou e quando', () => {
  const { isApproved } = require('../src/sender');
  assert.equal(isApproved({ approved: true, approval: { by: 'Dono', at: 'x' } }), true);
  assert.equal(isApproved({ approved: true, approval: null }), false);
  assert.equal(isApproved({ approved: false, approval: { by: 'Dono', at: 'x' } }), false);
});

