// Cliente da Evolution API (v2.3.x). Usa somente fetch nativo do Node.
// Endpoints (verificados no código da Evolution 2.3.7):
//   GET  /group/fetchAllGroups/{instance}?getParticipants=true
//   POST /chat/findMessages/{instance}      body: { where: { key: { remoteJid } }, page, offset }
//   POST /message/sendText/{instance}       body: { number, text, delay }
// A chave vai só no header "apikey" e nunca aparece em mensagens de erro.
'use strict';

class EvolutionError extends Error {
  constructor(status, route) {
    super(`Evolution API respondeu HTTP ${status} em ${route}`);
    this.name = 'EvolutionError';
    this.status = status;
  }
}

class EvolutionClient {
  constructor({ baseUrl, apiKey, timeoutMs = 15000, fetchImpl = globalThis.fetch }) {
    if (!apiKey) throw new Error('Chave da Evolution API ausente (rode scripts/make-env.js).');
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetch = fetchImpl;
  }

  async request(method, route, body) {
    const headers = { apikey: this.apiKey };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const res = await this.fetch(new URL(route, this.baseUrl), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new EvolutionError(res.status, route);
    return res.json();
  }

  // Lista grupos da conta conectada, com participantes (necessário para churn).
  async fetchGroups(instance, { withParticipants = true } = {}) {
    const q = `?getParticipants=${withParticipants ? 'true' : 'false'}`;
    const data = await this.request('GET', `/group/fetchAllGroups/${encodeURIComponent(instance)}${q}`);
    return Array.isArray(data) ? data : [];
  }

  // Uma página de mensagens de um chat/grupo (mais recentes primeiro).
  async findMessages(instance, remoteJid, { page = 1, offset = 100 } = {}) {
    const data = await this.request('POST', `/chat/findMessages/${encodeURIComponent(instance)}`, {
      where: { key: { remoteJid } },
      page,
      offset,
    });
    const records = data?.messages?.records ?? data?.records ?? [];
    return Array.isArray(records) ? records : [];
  }

  // Envio de texto. Não chame diretamente: use src/sender.js, que aplica as travas de aprovação.
  async sendText(instance, number, text, delayMs = 1200) {
    return this.request('POST', `/message/sendText/${encodeURIComponent(instance)}`, {
      number,
      text,
      delay: delayMs,
    });
  }
}

module.exports = { EvolutionClient, EvolutionError };
