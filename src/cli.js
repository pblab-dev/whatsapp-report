#!/usr/bin/env node
// CLI do WhatsApp Report. Uso: node src/cli.js <comando> [opções]
//  groups                                   lista grupos ativos (somente leitura)
//  select-groups --jids a@g.us,b@g.us       define os grupos monitorados (após o dono escolher)
//  add-recipient --id X --type group|user --target T --name N [--schedule nightly|twice|HH:MM,..] [--groups jid,..] [--period-days 7]
//  approve-recipient --id X --by "Nome"     registra aprovação explícita do dono
//  collect                                  coleta mensagens e participantes (somente leitura)
//  report [--days 7]                        imprime o relatório (não envia nada)
//  run [--real]                             coleta e envia para destinatários aprovados com horário vencido.
//                                           Sem --real (e sem WR_ALLOW_REAL_SEND=1) só simula.
//  status                                   resumo local (sem segredos nem números de telefone)
'use strict';

const { loadConfig } = require('./config');
const { EvolutionClient } = require('./evolution');
const store = require('./store');
const { collectGroup } = require('./collect');
const { computeGroupMetrics } = require('./metrics');
const { buildReport } = require('./report');
const schedule = require('./schedule');
const { dispatch, isApproved } = require('./sender');

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Error(`Argumento inesperado: ${a}`);
    const key = a.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith('--')) opts[key] = true;
    else {
      opts[key] = next;
      i++;
    }
  }
  return { command, opts };
}

function client(config) {
  return new EvolutionClient({ baseUrl: config.baseUrl, apiKey: config.apiKey });
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

async function cmdGroups(config) {
  const groups = await client(config).fetchGroups(config.instance, { withParticipants: false });
  const rows = groups.map((g) => `- ${g.subject || '(sem nome)'} · ${g.id} · ${g.size ?? '?'} membros`);
  return rows.length ? rows.join('\n') : 'Nenhum grupo encontrado (a conta está conectada?).';
}

function cmdSelectGroups(dir, opts, groupsMeta) {
  const cfg = store.loadConfigFile(dir);
  const jids = String(opts.jids || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (jids.length === 0) throw new Error('Informe --jids.');
  const names = new Map((groupsMeta || []).map((g) => [g.id, g.subject]));
  cfg.groups = jids.map((jid) => ({ jid, name: names.get(jid) || jid }));
  store.saveConfigFile(dir, cfg);
  return `Grupos monitorados: ${cfg.groups.length}`;
}

function cmdAddRecipient(dir, opts) {
  const cfg = store.loadConfigFile(dir);
  if (!opts.id || !opts.type || !opts.target) throw new Error('Informe --id, --type e --target.');
  if (cfg.recipients.some((r) => r.id === opts.id)) throw new Error(`Destinatário ${opts.id} já existe.`);
  const r = {
    id: opts.id,
    type: opts.type,
    target: opts.target,
    name: opts.name || opts.id,
    schedule: opts.schedule || 'nightly',
    groups: opts.groups ? String(opts.groups).split(',').map((s) => s.trim()) : null,
    periodDays: Number(opts['period-days'] || 7),
    approved: false,
    approval: null,
  };
  schedule.parseTimes(r.schedule);
  cfg.recipients.push(r);
  store.saveConfigFile(dir, cfg);
  return `Destinatário ${r.id} criado sem aprovação (approved=false).`;
}

function cmdApprove(dir, opts) {
  const cfg = store.loadConfigFile(dir);
  const r = cfg.recipients.find((x) => x.id === opts.id);
  if (!r) throw new Error('Destinatário não encontrado.');
  if (!opts.by) throw new Error('Informe --by com o nome de quem aprovou.');
  r.approved = true;
  r.approval = { by: String(opts.by), at: new Date().toISOString() };
  store.saveConfigFile(dir, cfg);
  return `Aprovado: ${r.id} por ${r.approval.by}.`;
}

// Coleta de todos os grupos monitorados. Retorna o resumo e o store já atualizado.
async function cmdCollect(config, dir, s) {
  const cfg = store.loadConfigFile(dir);
  if (cfg.groups.length === 0) throw new Error('Nenhum grupo monitorado. Use select-groups.');
  const c = client(config);
  const salt = store.getSalt(dir);
  const groups = await c.fetchGroups(config.instance, { withParticipants: true });
  const byId = new Map(groups.map((g) => [g.id, g]));
  const lines = [];
  for (const g of cfg.groups) {
    const meta = byId.get(g.jid);
    if (!meta) {
      lines.push(`- ${g.name}: não encontrado na conta conectada`);
      continue;
    }
    const res = await collectGroup({ client: c, instance: config.instance, store: s, salt, groupJid: g.jid, groupMeta: meta, nowSec: nowSec() });
    lines.push(`- ${g.name}: ${res.newMessages} novas mensagens (metadados) · ${res.members} membros`);
  }
  return lines.join('\n');
}

function metricsFor(dir, s, cfg, nowS, periodDays, groupFilter) {
  const chosen = cfg.groups.filter((g) => !groupFilter || groupFilter.includes(g.jid));
  return chosen.map((g) =>
    computeGroupMetrics({
      groupJid: g.jid,
      name: s.groups[g.jid]?.name || g.name,
      messages: s.messages[g.jid] || [],
      snapshots: s.snapshots[g.jid] || [],
      nowSec: nowS,
      periodDays,
      tz: cfg.timezone || 'America/Fortaleza',
    }),
  );
}

function cmdReport(config, dir, s, opts) {
  const cfg = { ...store.loadConfigFile(dir), timezone: config.timezone };
  const days = Number(opts.days || 7);
  const list = metricsFor(dir, s, cfg, nowSec(), days, null);
  if (list.length === 0) throw new Error('Nenhum grupo monitorado.');
  return buildReport(list, { nowSec: nowSec(), tz: config.timezone, periodDays: days });
}

async function cmdRun(config, dir, s, opts) {
  const cfg = store.loadConfigFile(dir);
  const now = nowSec();
  const due = cfg.recipients.filter(
    (r) => isApproved(r) && schedule.dueSlot(r.schedule, now, config.timezone) !== null,
  );
  if (due.length === 0) return 'Nenhum destinatário aprovado com horário vencido agora.';
  const confirmReal = Boolean(opts.real);
  const results = await dispatch({
    client: client(config),
    instance: config.instance,
    config,
    store: s,
    recipients: due,
    nowSec: now,
    confirmReal,
    buildText: (r) => {
      const list = metricsFor(dir, s, { ...cfg, timezone: config.timezone }, now, r.periodDays || 7, r.groups);
      return buildReport(list, { nowSec: now, tz: config.timezone, periodDays: r.periodDays || 7 });
    },
    log: () => {},
  });
  return results.map((x) => `- ${x.recipientId}: ${x.status}${x.reason ? ` (${x.reason})` : ''}`).join('\n');
}

function cmdStatus(config, dir, s) {
  const cfg = store.loadConfigFile(dir);
  const approved = cfg.recipients.filter(isApproved).length;
  return [
    `Grupos monitorados: ${cfg.groups.length}`,
    `Destinatários: ${cfg.recipients.length} (aprovados: ${approved})`,
    `Mensagens armazenadas: ${Object.values(s.messages).reduce((a, m) => a + m.length, 0)}`,
    `Envio real liberado por variável: ${config.realSendEnabled ? 'sim' : 'não'}`,
    `Janela de envio: ${config.sendWindow.startHour}h–${config.sendWindow.endHour}h (${config.timezone})`,
  ].join('\n');
}

async function main(argv) {
  const { command, opts } = parseArgs(argv);
  const config = loadConfig();
  const dir = config.dataDir;
  const s = store.loadStore(dir);
  let out;
  switch (command) {
    case 'groups':
      out = await cmdGroups(config);
      break;
    case 'select-groups': {
      const metas = await client(config).fetchGroups(config.instance, { withParticipants: false }).catch(() => []);
      out = cmdSelectGroups(dir, opts, metas);
      break;
    }
    case 'add-recipient':
      out = cmdAddRecipient(dir, opts);
      break;
    case 'approve-recipient':
      out = cmdApprove(dir, opts);
      break;
    case 'collect':
      out = await cmdCollect(config, dir, s);
      store.saveStore(dir, s);
      break;
    case 'report':
      out = cmdReport(config, dir, s, opts);
      break;
    case 'run':
      out = await cmdRun(config, dir, s, opts);
      store.saveStore(dir, s);
      break;
    case 'status':
      out = cmdStatus(config, dir, s);
      break;
    default:
      out = 'Uso: node src/cli.js {groups|select-groups|add-recipient|approve-recipient|collect|report|run|status}';
      process.exitCode = 2;
  }
  console.log(out);
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`erro: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { parseArgs, main };
