// Agendamento (funções puras). Periodicidade escolhida pelo usuário no setup:
//  - "twice": 2x ao dia (09:00 e 21:00)   - "nightly": 1x à noite (21:00)
//  - ou horários próprios "HH:MM,HH:MM" (dentro da janela de envio).
// Travas do teto inicial: janela de envio, no máximo 1 relatório por dia por destinatário
// e pausa mínima entre envios. O envio real também exige aprovação (src/sender.js).
'use strict';

const PRESETS = { twice: ['09:00', '21:00'], nightly: ['21:00'] };

function parseTimes(spec) {
  const list = PRESETS[spec] || String(spec || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) throw new Error('Agenda vazia.');
  for (const t of list) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) throw new Error(`Horário inválido: ${t}`);
  }
  return list;
}

function localParts(tsSec, tz) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(tsSec * 1000));
  const get = (type) => parts.find((p) => p.type === type).value;
  return {
    dayKey: `${get('year')}-${get('month')}-${get('day')}`,
    hour: Number(get('hour')),
    minute: Number(get('minute')),
  };
}

// Janela de envio: [startHour, endHour) no fuso informado.
function withinSendWindow(tsSec, tz, window = { startHour: 8, endHour: 22 }) {
  const { hour } = localParts(tsSec, tz);
  return hour >= window.startHour && hour < window.endHour;
}

// Slot pendente de hoje: o primeiro horário já vencido que ainda não foi usado.
// `usedSlots` são chaves "YYYY-MM-DD HH:MM".
function dueSlot(spec, tsSec, tz, usedSlots = new Set()) {
  const now = localParts(tsSec, tz);
  const nowMin = now.hour * 60 + now.minute;
  for (const t of parseTimes(spec)) {
    const [h, m] = t.split(':').map(Number);
    const key = `${now.dayKey} ${t}`;
    if (nowMin >= h * 60 + m && !usedSlots.has(key)) return key;
  }
  return null;
}

// Trava de 1 relatório por dia por destinatário, a partir do ledger (lista de envios).
function sentToday(ledger, recipientId, dayKey, tz) {
  return ledger.filter(
    (e) => e.recipientId === recipientId && e.status === 'sent' && localParts(e.ts, tz).dayKey === dayKey,
  ).length;
}

function canSendToday(ledger, recipientId, dayKey, tz, cap = 1) {
  return sentToday(ledger, recipientId, dayKey, tz) < cap;
}

// Pausa mínima entre envios para o mesmo destinatário (e entre quaisquer envios).
function secondsUntilNextAllowed(ledger, nowSec, gapSec) {
  const sent = ledger.filter((e) => e.status === 'sent');
  if (sent.length === 0) return 0;
  const last = Math.max(...sent.map((e) => e.ts));
  return Math.max(0, last + gapSec - nowSec);
}

module.exports = {
  parseTimes,
  localParts,
  withinSendWindow,
  dueSlot,
  canSendToday,
  sentToday,
  secondsUntilNextAllowed,
  PRESETS,
};
