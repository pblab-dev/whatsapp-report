'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { computeGroupMetrics, verdict, hourInTz } = require('../src/metrics');
const { NOW, DAY } = require('./helpers');

const m = (sender, tsOffsetSec, fromMe = false) => ({ id: `${sender}-${tsOffsetSec}`, ts: NOW + tsOffsetSec, sender, fromMe, type: 'conversation' });

// Cenário: 10 membros há 10 dias; há 3 dias 5 saem em bloco e entra 1 (k).
const snapA = { ts: NOW - 10 * DAY, members: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] };
const snapB = { ts: NOW - 3 * DAY, members: ['f', 'g', 'h', 'i', 'j', 'k'] };

const messages = [
  m('f', -1 * 3600), // 10h local
  m('f', -2 * 3600), // 09h local
  m('g', -1 * 3600), // 10h local
  m('me', -3 * 3600, true), // 08h local
  m('h', -10 * DAY), // fora do período, mas recente o suficiente para não estar em risco
];

const metrics = computeGroupMetrics({
  groupJid: 'g1@g.us',
  name: 'Turma',
  messages,
  snapshots: [snapA, snapB],
  nowSec: NOW,
  periodDays: 7,
  tz: 'America/Fortaleza',
  riskDays: 14,
});

test('painel: volume, ativos vs. inativos e pico na hora local', () => {
  assert.equal(metrics.panel.messages, 4, 'só mensagens dentro dos 7 dias');
  assert.equal(metrics.panel.incomingMessages, 3);
  assert.equal(metrics.panel.members, 6);
  assert.equal(metrics.panel.activeMembers, 2, 'f e g falaram');
  assert.equal(metrics.panel.inactiveMembers, 4);
  assert.ok(Math.abs(metrics.panel.activeRate - 2 / 6) < 1e-9);
  assert.deepEqual(metrics.panel.peakHours[0], { hour: 10, count: 2 });
});

test('churn: saídas, entradas, retenção e taxa de saída', () => {
  assert.equal(metrics.churn.startMembers, 10);
  assert.equal(metrics.churn.left, 5);
  assert.equal(metrics.churn.joined, 1);
  assert.ok(Math.abs(metrics.churn.churnRate - 0.5) < 1e-9);
  assert.ok(Math.abs(metrics.churn.retentionRate - 0.5) < 1e-9);
});

test('saída em massa é detectada e gera veredito de atenção', () => {
  assert.equal(metrics.churn.massExits.length, 1);
  assert.equal(metrics.churn.massExits[0].left, 5);
  assert.equal(verdict(metrics).emoji, '🔴');
});

test('membros em risco: sem mensagem nos últimos 14 dias', () => {
  // endSet = f,g,h,i,j,k. f e g falaram agora; h falou há 10 dias (ok); i e k nunca; j nunca nos mensagens.
  assert.equal(metrics.churn.atRisk, 3);
});

test('permanência só usa entradas observadas (não conta o snapshot inicial)', () => {
  assert.equal(metrics.churn.avgPermanenceDays, null);
  assert.equal(metrics.churn.permanenceSamples, 0);
});

test('permanência observada para quem entrou depois do primeiro snapshot', () => {
  const snaps = [
    { ts: NOW - 20 * DAY, members: ['x'] },
    { ts: NOW - 10 * DAY, members: ['x', 'y'] },
    { ts: NOW - 2 * DAY, members: ['x'] },
  ];
  const r = computeGroupMetrics({ groupJid: 'g2', messages: [], snapshots: snaps, nowSec: NOW, periodDays: 7 });
  assert.equal(r.churn.left, 1);
  assert.ok(Math.abs(r.churn.avgPermanenceDays - 8) < 1e-9, 'y ficou 8 dias observados');
});

test('hora local respeita o fuso (America/Fortaleza = UTC-3)', () => {
  assert.equal(hourInTz(Date.UTC(2026, 10, 22, 13, 0, 0) / 1000, 'America/Fortaleza'), 10);
});

test('sem snapshots e sem mensagens não quebra', () => {
  const r = computeGroupMetrics({ groupJid: 'g3', messages: [], snapshots: [], nowSec: NOW });
  assert.equal(r.panel.members, 0);
  assert.equal(r.churn.churnRate, 0);
  assert.equal(verdict(r).emoji, '🟢');
});
