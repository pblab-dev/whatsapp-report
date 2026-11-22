'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../src/schedule');

const TZ = 'America/Fortaleza';
// Horário local de Fortaleza = UTC-3, sem horário de verão.
const at = (y, mo, d, h, mi) => Math.floor(Date.UTC(y, mo - 1, d, h + 3, mi, 0) / 1000);

test('presets e horários customizados são validados', () => {
  assert.deepEqual(s.parseTimes('nightly'), ['21:00']);
  assert.deepEqual(s.parseTimes('twice'), ['09:00', '21:00']);
  assert.deepEqual(s.parseTimes('07:30,20:15'), ['07:30', '20:15']);
  assert.throws(() => s.parseTimes('25:00'), /inválido/);
  assert.throws(() => s.parseTimes(''), /vazia/);
});

test('slot noturno vence às 21h locais, não antes', () => {
  assert.equal(s.dueSlot('nightly', at(2026, 11, 22, 20, 59), TZ), null);
  assert.equal(s.dueSlot('nightly', at(2026, 11, 22, 21, 0), TZ), '2026-11-22 21:00');
});

test('janela de envio: 08h até 21h59 locais', () => {
  const w = { startHour: 8, endHour: 22 };
  assert.equal(s.withinSendWindow(at(2026, 11, 22, 7, 59), TZ, w), false);
  assert.equal(s.withinSendWindow(at(2026, 11, 22, 8, 0), TZ, w), true);
  assert.equal(s.withinSendWindow(at(2026, 11, 22, 21, 59), TZ, w), true);
  assert.equal(s.withinSendWindow(at(2026, 11, 22, 22, 0), TZ, w), false);
});

test('teto de 1 relatório por dia por destinatário', () => {
  const ledger = [{ recipientId: 'r1', ts: at(2026, 11, 22, 21, 0), status: 'sent' }];
  assert.equal(s.canSendToday(ledger, 'r1', '2026-11-22', TZ, 1), false);
  assert.equal(s.canSendToday(ledger, 'r1', '2026-11-23', TZ, 1), true, 'outro dia libera');
  assert.equal(s.canSendToday(ledger, 'r2', '2026-11-22', TZ, 1), true, 'outro destinatário libera');
});

test('envios simulados não contam para o teto', () => {
  const ledger = [{ recipientId: 'r1', ts: at(2026, 11, 22, 21, 0), status: 'simulated' }];
  assert.equal(s.canSendToday(ledger, 'r1', '2026-11-22', TZ, 1), true);
});

test('pausa mínima entre envios', () => {
  const T = at(2026, 11, 22, 21, 0);
  const ledger = [{ recipientId: 'r1', ts: T, status: 'sent' }];
  assert.equal(s.secondsUntilNextAllowed(ledger, T, 90), 90);
  assert.equal(s.secondsUntilNextAllowed(ledger, T + 90, 90), 0);
});
