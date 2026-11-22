'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeGroupMetrics } = require('../src/metrics');
const { buildReport } = require('../src/report');
const { NOW, DAY } = require('./helpers');

const snaps = [
  { ts: NOW - 10 * DAY, members: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] },
  { ts: NOW - 3 * DAY, members: ['f', 'g', 'h', 'i', 'j', 'k'] },
];
const msgs = [{ id: '1', ts: NOW - 3600, sender: 'f', fromMe: false, type: 'conversation' }];

test('relatório segue o formato padrão: título, 📍 contexto, veredito primeiro e seções', () => {
  const metrics = [computeGroupMetrics({ groupJid: 'g1@g.us', name: 'Turma A', messages: msgs, snapshots: snaps, nowSec: NOW, periodDays: 7 })];
  const text = buildReport(metrics, { nowSec: NOW, tz: 'America/Fortaleza', periodDays: 7 });
  const lines = text.split('\n');
  assert.match(lines[0], /^📊 \*Relatório de grupos/);
  assert.match(lines[1], /^📍 Contexto:/);
  assert.match(text, /✅ \*Veredito:\* 🔴/, 'veredito antes das seções');
  assert.ok(text.indexOf('✅ *Veredito') < text.indexOf('📈 *Painel'));
  for (const h of ['📈 *Painel de métricas*', '🚪 *Churn e retenção*', '🎯 *Diagnóstico*', '🔗 *Impacto*', '⚠️ *Limitações*']) {
    assert.ok(text.includes(h), `falta a seção ${h}`);
  }
});

test('relatório não usa tabela markdown (WhatsApp não renderiza) e usa vírgula decimal', () => {
  const metrics = [computeGroupMetrics({ groupJid: 'g1@g.us', name: 'Turma A', messages: msgs, snapshots: snaps, nowSec: NOW, periodDays: 7 })];
  const text = buildReport(metrics, { nowSec: NOW, tz: 'America/Fortaleza', periodDays: 7 });
  assert.ok(!/^\|.*\|$/m.test(text));
  assert.match(text, /50,0%/);
});

test('relatório com um grupo sem sinais diz que está estável', () => {
  const metrics = [computeGroupMetrics({ groupJid: 'g9', name: 'Calmo', messages: [], snapshots: [{ ts: NOW - DAY, members: ['a'] }], nowSec: NOW, periodDays: 7 })];
  const text = buildReport(metrics, { nowSec: NOW, tz: 'America/Fortaleza', periodDays: 7 });
  assert.match(text, /Todos os grupos estáveis|🟢/);
});
