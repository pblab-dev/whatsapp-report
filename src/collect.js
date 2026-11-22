// Coleta de grupos pela Evolution API: mensagens (metadados) e snapshots de participantes.
// Somente leitura. Nenhuma mensagem é enviada aqui.
'use strict';

const { pseudonymize } = require('./store');

const DAY = 86400;
const DEFAULT_RETENTION_DAYS = 120;

// Converte um registro bruto da Evolution em metadados sem conteúdo.
function normalizeMessage(raw, salt) {
  const key = raw?.key || {};
  const groupJid = key.remoteJid;
  if (!key.id || !groupJid) return null;
  const ts = Number(raw.messageTimestamp);
  if (!Number.isFinite(ts)) return null;
  const senderJid = key.participant || (key.fromMe ? 'me' : groupJid);
  return {
    id: key.id,
    ts,
    fromMe: Boolean(key.fromMe),
    sender: pseudonymize(salt, senderJid),
    type: String(raw.messageType || 'unknown'),
  };
}

// Pagina o histórico do grupo até cobrir `sinceSec` ou esgotar as páginas.
async function fetchNewMessages({ client, instance, groupJid, salt, knownIds, sinceSec, pageSize = 100, maxPages = 50 }) {
  const out = [];
  for (let page = 1; page <= maxPages; page++) {
    const records = await client.findMessages(instance, groupJid, { page, offset: pageSize });
    if (records.length === 0) break;
    let reachedSince = false;
    for (const raw of records) {
      const m = normalizeMessage(raw, salt);
      if (!m) continue;
      if (m.ts < sinceSec) {
        reachedSince = true;
        continue;
      }
      if (!knownIds.has(m.id)) {
        knownIds.add(m.id);
        out.push(m);
      }
    }
    if (reachedSince || records.length < pageSize) break;
  }
  return out;
}

// Atualiza o store com a coleta de um grupo. `groupMeta` é o objeto do fetchAllGroups.
async function collectGroup({ client, instance, store, salt, groupJid, groupMeta, nowSec, lookbackDays = 35, retentionDays = DEFAULT_RETENTION_DAYS }) {
  const messages = store.messages[groupJid] || [];
  const knownIds = new Set(messages.map((m) => m.id));
  const fresh = await fetchNewMessages({
    client,
    instance,
    groupJid,
    salt,
    knownIds,
    sinceSec: nowSec - lookbackDays * DAY,
  });
  const cutoff = nowSec - retentionDays * DAY;
  store.messages[groupJid] = messages.concat(fresh).filter((m) => m.ts >= cutoff);

  store.groups[groupJid] = {
    name: groupMeta?.subject || store.groups[groupJid]?.name || groupJid,
    size: Array.isArray(groupMeta?.participants) ? groupMeta.participants.length : groupMeta?.size ?? 0,
  };

  // Snapshot de participantes: grava somente quando a lista muda (ou no primeiro registro).
  const members = (groupMeta?.participants || []).map((p) => pseudonymize(salt, p.id)).sort();
  const snaps = store.snapshots[groupJid] || [];
  const last = snaps[snaps.length - 1];
  const changed = !last || last.members.join(',') !== members.join(',');
  if (changed && members.length > 0) snaps.push({ ts: nowSec, members });
  store.snapshots[groupJid] = snaps.filter((s) => s.ts >= cutoff || s === snaps[snaps.length - 1]);

  return { newMessages: fresh.length, members: members.length, snapshotChanged: changed && members.length > 0 };
}

module.exports = { normalizeMessage, fetchNewMessages, collectGroup, DAY };
