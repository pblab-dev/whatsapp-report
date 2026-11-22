// Métricas do MVP (docs/mapa-funcoes.md):
//  - Painel de métricas: volume de mensagens, membros ativos vs. inativos, horários de pico,
//    comparação entre grupos.
//  - Churn e retenção: taxa de saída, membros em risco, tempo médio de permanência observado,
//    saídas em massa.
// Entrada: mensagens normalizadas (ts em segundos, sender pseudonimizado, fromMe) e snapshots
// de participantes ({ts, members[]}) em ordem crescente. Funções puras, sem I/O.
'use strict';

const DAY = 86400;

const hourFormatterCache = new Map();
function hourInTz(tsSec, tz) {
  if (!hourFormatterCache.has(tz)) {
    hourFormatterCache.set(tz, new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }));
  }
  const part = hourFormatterCache.get(tz).formatToParts(new Date(tsSec * 1000)).find((p) => p.type === 'hour');
  return Number(part.value) % 24;
}

// Último snapshot com ts <= t (ou null se não houver nenhum).
function snapshotAt(snapshots, t) {
  let found = null;
  for (const s of snapshots) if (s.ts <= t) found = s;
  return found;
}

function computeGroupMetrics({
  groupJid,
  name,
  messages,
  snapshots,
  nowSec,
  periodDays = 7,
  tz = 'America/Fortaleza',
  riskDays = 14,
  massExitMin = 5,
  massExitPct = 0.1,
  topHours = 3,
}) {
  const periodStart = nowSec - periodDays * DAY;
  const inPeriod = messages.filter((m) => m.ts >= periodStart && m.ts <= nowSec);
  const incoming = inPeriod.filter((m) => !m.fromMe);

  // Painel
  const senders = new Set(incoming.map((m) => m.sender));
  const hourCount = new Map();
  for (const m of inPeriod) {
    const h = hourInTz(m.ts, tz);
    hourCount.set(h, (hourCount.get(h) || 0) + 1);
  }
  const peakHours = [...hourCount.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, topHours)
    .map(([hour, count]) => ({ hour, count }));

  // Membros e churn
  const endSnap = snapshotAt(snapshots, nowSec);
  const startSnap = snapshotAt(snapshots, periodStart) || snapshots[0] || null;
  const endSet = new Set(endSnap ? endSnap.members : []);
  const startSet = new Set(startSnap ? startSnap.members : []);
  const members = endSet.size;
  const activeMembers = [...senders].filter((s) => endSet.has(s)).length;
  const inactiveMembers = Math.max(0, members - activeMembers);
  const activeRate = members ? activeMembers / members : 0;

  const left = [...startSet].filter((s) => !endSet.has(s));
  const joined = [...endSet].filter((s) => !startSet.has(s));
  const kept = startSet.size - left.length;
  const churnRate = startSet.size ? left.length / startSet.size : 0;
  const retentionRate = startSet.size ? kept / startSet.size : 1;

  // Membros em risco: ainda no grupo, sem nenhuma mensagem nos últimos riskDays.
  const lastSeen = new Map();
  for (const m of messages) {
    if (m.fromMe) continue;
    if (!lastSeen.has(m.sender) || lastSeen.get(m.sender) < m.ts) lastSeen.set(m.sender, m.ts);
  }
  const riskCut = nowSec - riskDays * DAY;
  const atRisk = [...endSet].filter((s) => !lastSeen.has(s) || lastSeen.get(s) < riskCut).length;

  // Saídas em massa: entre snapshots consecutivos dentro do período.
  const massExits = [];
  for (let i = 1; i < snapshots.length; i++) {
    const prev = snapshots[i - 1];
    const cur = snapshots[i];
    if (cur.ts < periodStart || cur.ts > nowSec) continue;
    const curSet = new Set(cur.members);
    const gone = prev.members.filter((s) => !curSet.has(s)).length;
    const threshold = Math.max(massExitMin, Math.ceil(prev.members.length * massExitPct));
    if (gone >= threshold) massExits.push({ ts: cur.ts, left: gone });
  }

  // Permanência observada: só para quem entrou depois do primeiro snapshot (entrada conhecida).
  const firstIndex = new Map();
  snapshots.forEach((snap, idx) => {
    for (const s of snap.members) if (!firstIndex.has(s)) firstIndex.set(s, idx);
  });
  const permanenceDays = [];
  for (const s of left) {
    const idx = firstIndex.get(s);
    if (idx === undefined || idx === 0) continue;
    const leftAt = snapshots.find((snap, j) => j > idx && !snap.members.includes(s));
    if (!leftAt) continue;
    permanenceDays.push((leftAt.ts - snapshots[idx].ts) / DAY);
  }
  const avgPermanenceDays = permanenceDays.length
    ? permanenceDays.reduce((a, b) => a + b, 0) / permanenceDays.length
    : null;

  return {
    groupJid,
    name: name || groupJid,
    periodDays,
    panel: {
      messages: inPeriod.length,
      incomingMessages: incoming.length,
      members,
      activeMembers,
      inactiveMembers,
      activeRate,
      peakHours,
    },
    churn: {
      startMembers: startSet.size,
      joined: joined.length,
      left: left.length,
      churnRate,
      retentionRate,
      atRisk,
      massExits,
      avgPermanenceDays,
      permanenceSamples: permanenceDays.length,
    },
    dataQuality: {
      snapshots: snapshots.length,
      hasStartSnapshot: Boolean(startSnap),
      messageRecords: messages.length,
    },
  };
}

// Ranking de grupos por volume (comparação entre grupos).
function compareGroups(metrics) {
  return [...metrics].sort((a, b) => b.panel.messages - a.panel.messages);
}

// Veredito curto para a primeira tela do relatório.
function verdict(m) {
  if (m.churn.massExits.length > 0) return { emoji: '🔴', text: 'Atenção: saída em massa no período' };
  if (m.churn.churnRate >= 0.05) return { emoji: '🟠', text: 'Churn acima de 5% no período' };
  if (m.panel.members >= 10 && m.panel.activeRate < 0.2) return { emoji: '🟡', text: 'Engajamento baixo: poucos membros falam' };
  return { emoji: '🟢', text: 'Estável no período' };
}

module.exports = { computeGroupMetrics, compareGroups, verdict, snapshotAt, hourInTz, DAY };
