// Relatório em texto para WhatsApp, no formato padrão do projeto (formato-visual):
// título com emoji → 📍 contexto → veredito na primeira tela → seções por origem →
// 🎯 diagnóstico → 🔗 impacto → ⚠️ limitações. Sem tabelas em markdown (WhatsApp não renderiza).
'use strict';

const { compareGroups, verdict } = require('./metrics');

const pct = (x) => `${(x * 100).toFixed(1).replace('.', ',')}%`;
const num = (n) => Number(n).toLocaleString('pt-BR');

function dateLabel(nowSec, tz) {
  return new Date(nowSec * 1000).toLocaleDateString('pt-BR', { timeZone: tz });
}

function buildReport(metricsList, { nowSec, tz = 'America/Fortaleza', periodDays = 7 } = {}) {
  const ordered = compareGroups(metricsList);
  const totalMsgs = ordered.reduce((a, m) => a + m.panel.messages, 0);
  const worst = ordered.map((m) => ({ m, v: verdict(m) })).find((x) => x.v.emoji !== '🟢');
  const headline = worst
    ? `${worst.v.emoji} ${worst.v.text} em *${worst.m.name}*`
    : '🟢 Todos os grupos estáveis no período';

  const lines = [];
  lines.push(`📊 *Relatório de grupos — ${dateLabel(nowSec, tz)}*`);
  lines.push(
    `📍 Contexto: últimos ${periodDays} dias · ${ordered.length} grupo(s) · ${num(totalMsgs)} mensagens · fuso ${tz}`,
  );
  lines.push('');
  lines.push(`✅ *Veredito:* ${headline}`);
  lines.push('');

  lines.push('📈 *Painel de métricas*');
  for (const m of ordered) {
    const p = m.panel;
    const peak = p.peakHours.length ? p.peakHours.map((h) => `${String(h.hour).padStart(2, '0')}h`).join(', ') : 'sem dados';
    lines.push(`• *${m.name}*`);
    lines.push(`  Mensagens: ${num(p.messages)} · Membros: ${num(p.members)}`);
    lines.push(`  Ativos: ${num(p.activeMembers)} (${pct(p.activeRate)}) · Inativos: ${num(p.inactiveMembers)}`);
    lines.push(`  Horários de pico: ${peak}`);
  }
  lines.push('');

  lines.push('🚪 *Churn e retenção*');
  for (const m of ordered) {
    const c = m.churn;
    const perm = c.avgPermanenceDays === null
      ? 'sem amostra suficiente'
      : `${c.avgPermanenceDays.toFixed(1).replace('.', ',')} dias (observado)`;
    lines.push(`• *${m.name}*`);
    lines.push(`  Saídas: ${num(c.left)} (${pct(c.churnRate)}) · Entradas: ${num(c.joined)}`);
    lines.push(`  Retenção: ${pct(c.retentionRate)} · Em risco: ${num(c.atRisk)}`);
    lines.push(`  Permanência média: ${perm}`);
    for (const e of c.massExits) {
      const d = new Date(e.ts * 1000).toLocaleString('pt-BR', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      lines.push(`  🔴 Saída em massa: ${num(e.left)} membros em ${d}`);
    }
  }
  lines.push('');

  lines.push('🎯 *Diagnóstico*');
  const diag = [];
  for (const m of ordered) {
    if (m.churn.massExits.length) diag.push(`${m.name}: saída em massa detectada, verificar causa.`);
    else if (m.churn.churnRate >= 0.05) diag.push(`${m.name}: churn de ${pct(m.churn.churnRate)} no período.`);
    if (m.panel.members >= 10 && m.panel.activeRate < 0.2) {
      diag.push(`${m.name}: só ${pct(m.panel.activeRate)} dos membros falaram no período.`);
    }
  }
  lines.push(diag.length ? diag.map((d) => `• ${d}`).join('\n') : '• Nenhum sinal de alerta neste período.');
  lines.push('');

  lines.push('🔗 *Impacto*');
  lines.push('• Use os sinais de churn e de engajamento para decidir ações de retenção nos grupos citados.');
  lines.push('');

  lines.push('⚠️ *Limitações*');
  lines.push('• Dados vindos da Evolution API (sessão WhatsApp Web, não oficial).');
  lines.push('• Saídas e entradas são detectadas pela comparação de snapshots; movimentos que se anulam entre duas coletas não aparecem.');
  lines.push('• Permanência média só considera membros cuja entrada foi observada pelo monitoramento.');
  lines.push('• Histórico limitado ao que a Evolution armazenou desde a conexão do número.');
  return lines.join('\n');
}

module.exports = { buildReport, pct, num };
