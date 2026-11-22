// Configuração do app. Nunca imprime valores sensíveis (chave da Evolution).
// Variáveis: EVOLUTION_ENV_FILE (caminho do .env da Evolution), EVOLUTION_API_URL (padrão http://127.0.0.1:8080), EVOLUTION_API_KEY (ou lida de
// evolution-api/.env em memória), EVOLUTION_INSTANCE_NAME, TIMEZONE, WR_DATA_DIR,
// WR_ALLOW_REAL_SEND (somente "1" libera envio real), WR_MIN_GAP_SECONDS.
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

function readApiKeyFromEnvFile(file) {
  try {
    const m = fs.readFileSync(file, 'utf8').match(/^AUTHENTICATION_API_KEY=(.*)$/m);
    return m ? m[1].trim() : '';
  } catch {
    return '';
  }
}

function loadConfig(env = process.env) {
  const url = new URL(env.EVOLUTION_API_URL || `http://127.0.0.1:${env.EVO_PORT || 8080}`);
  if (!LOOPBACK.has(url.hostname)) {
    throw new Error('EVOLUTION_API_URL deve apontar para 127.0.0.1 (loopback). Recusado.');
  }
  const apiKey =
    env.EVOLUTION_API_KEY || readApiKeyFromEnvFile(env.EVOLUTION_ENV_FILE || path.join(ROOT, 'evolution-api', '.env'));
  return {
    baseUrl: url.origin,
    apiKey,
    instance: env.EVOLUTION_INSTANCE_NAME || 'whatsapp-report',
    timezone: env.TIMEZONE || 'America/Fortaleza',
    dataDir: env.WR_DATA_DIR || path.join(ROOT, 'data'),
    realSendEnabled: env.WR_ALLOW_REAL_SEND === '1',
    minGapSeconds: Math.max(60, Number(env.WR_MIN_GAP_SECONDS || 90)),
    maxReportsPerRecipientPerDay: 1,
    sendWindow: { startHour: 8, endHour: 22 },
  };
}

module.exports = { loadConfig, ROOT };
