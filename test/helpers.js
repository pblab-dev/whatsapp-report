// Servidor falso da Evolution API (somente 127.0.0.1) para os testes. Não fala com WhatsApp.
'use strict';

const http = require('http');

const DAY = 86400;
const NOW = Math.floor(Date.UTC(2026, 10, 22, 14, 0, 0) / 1000); // 2026-11-22 11:00 America/Fortaleza

function startFakeEvolution({ apiKey = 'test-key', groups = [], messagesByJid = {}, sendStatus = 201 } = {}) {
  const calls = { sends: [], unauthorized: 0 };
  const server = http.createServer((req, res) => {
    if (req.headers.apikey !== apiKey) {
      calls.unauthorized++;
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end('{"error":"unauthorized"}');
    }
    const url = new URL(req.url, 'http://127.0.0.1');
    let body = '';
    req.on('data', (d) => (body += d));
    req.on('end', () => {
      const send = (code, obj) => {
        res.writeHead(code, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      };
      if (req.method === 'GET' && url.pathname.startsWith('/group/fetchAllGroups/')) {
        return send(200, groups);
      }
      if (req.method === 'POST' && url.pathname.startsWith('/chat/findMessages/')) {
        const { where, page = 1, offset = 100 } = JSON.parse(body || '{}');
        const all = messagesByJid[where?.key?.remoteJid] || [];
        const records = all.slice((page - 1) * offset, page * offset);
        return send(200, { messages: { total: all.length, pages: Math.ceil(all.length / offset), currentPage: page, records } });
      }
      if (req.method === 'POST' && url.pathname.startsWith('/message/sendText/')) {
        calls.sends.push(JSON.parse(body || '{}'));
        if (sendStatus >= 400) return send(sendStatus, { error: 'falha simulada' });
        return send(sendStatus, { key: { id: 'FAKE' } });
      }
      send(404, { error: 'not found' });
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        apiKey,
        calls,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

function baseConfig(overrides = {}) {
  return {
    baseUrl: 'http://127.0.0.1:1',
    apiKey: 'test-key',
    instance: 'whatsapp-report',
    timezone: 'America/Fortaleza',
    dataDir: '/tmp/unused',
    realSendEnabled: false,
    minGapSeconds: 60,
    maxReportsPerRecipientPerDay: 1,
    sendWindow: { startHour: 8, endHour: 22 },
    ...overrides,
  };
}

module.exports = { startFakeEvolution, baseConfig, NOW, DAY };
