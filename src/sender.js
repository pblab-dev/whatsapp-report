// Envio de relatórios pela Evolution API com travas em cascata. Por padrão NÃO envia:
//  1. Destinatário precisa de aprovação explícita do dono (approved=true + approval.by + approval.at).
//  2. Dentro da janela de envio (08h–22h no fuso do projeto).
//  3. Limite de 1 relatório por dia por destinatário (conta só envios com status "sent").
//  4. Pausa mínima entre envios (WR_MIN_GAP_SECONDS, mínimo 60 s).
//  5. Envio real só com WR_ALLOW_REAL_SEND=1 E confirmReal=true (flag --real na CLI).
// Sem as travas 5, o resultado é "simulated": nada chega à Evolution.
'use strict';

const schedule = require('./schedule');

const SEND_RESULT = { SENT: 'sent', SIMULATED: 'simulated', SKIPPED: 'skipped', FAILED: 'failed' };

function targetNumber(recipient) {
  if (recipient.type === 'group') {
    if (!/^[\w-]+@g\.us$/.test(recipient.target || '')) throw new Error(`Destino de grupo inválido: ${recipient.id}`);
    return recipient.target;
  }
  if (recipient.type === 'user') {
    const digits = String(recipient.target || '').replace(/\D/g, '');
    if (digits.length < 10) throw new Error(`Número inválido: ${recipient.id}`);
    return digits;
  }
  throw new Error(`Tipo de destinatário inválido: ${recipient.id}`);
}

function isApproved(recipient) {
  return recipient.approved === true && Boolean(recipient.approval?.by) && Boolean(recipient.approval?.at);
}

// Processa a lista de destinatários. `buildText(recipient)` devolve o texto do relatório.
async function dispatch({
  client,
  instance,
  config,
  store,
  recipients,
  buildText,
  nowSec,
  confirmReal = false,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
  log = () => {},
}) {
  const results = [];
  const dayKey = schedule.localParts(nowSec, config.timezone).dayKey;
  const realAllowed = config.realSendEnabled && confirmReal === true;

  for (const r of recipients) {
    const base = { recipientId: r.id, ts: nowSec };
    if (!isApproved(r)) {
      results.push({ ...base, status: SEND_RESULT.SKIPPED, reason: 'sem aprovação do dono' });
      continue;
    }
    if (!schedule.withinSendWindow(nowSec, config.timezone, config.sendWindow)) {
      results.push({ ...base, status: SEND_RESULT.SKIPPED, reason: 'fora da janela de envio' });
      continue;
    }
    if (!schedule.canSendToday(store.recipientsLedger, r.id, dayKey, config.timezone, config.maxReportsPerRecipientPerDay)) {
      results.push({ ...base, status: SEND_RESULT.SKIPPED, reason: 'limite de 1 relatório por dia atingido' });
      continue;
    }

    const number = targetNumber(r);
    const text = buildText(r);
    if (!realAllowed) {
      results.push({ ...base, status: SEND_RESULT.SIMULATED, reason: 'envio real desligado', chars: text.length });
      continue;
    }

    const wait = schedule.secondsUntilNextAllowed(store.recipientsLedger, nowSec, config.minGapSeconds);
    if (wait > 0) await sleep(wait * 1000);
    try {
      await client.sendText(instance, number, text);
      const entry = { ...base, status: SEND_RESULT.SENT };
      store.recipientsLedger.push(entry);
      results.push(entry);
      log(`enviado para ${r.id}`);
    } catch (err) {
      const entry = { ...base, status: SEND_RESULT.FAILED, reason: err.message };
      store.recipientsLedger.push(entry);
      results.push(entry);
    }
  }
  return results;
}

module.exports = { dispatch, targetNumber, isApproved, SEND_RESULT };
