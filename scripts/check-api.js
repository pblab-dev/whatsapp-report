// Valida a Evolution API local sem expor a chave.
// Uso: node scripts/check-api.js            (porta padrão 8080; ou EVO_PORT=8080)
// Lê AUTHENTICATION_API_KEY de evolution-api/.env apenas em memória.
// Esperado: sem chave = 401; com chave = 200. Imprime só códigos HTTP e nome/status das instâncias.
const fs = require('fs');
const http = require('http');
const path = require('path');

const port = Number(process.env.EVO_PORT || 8080);
const envFile = path.join(__dirname, '..', 'evolution-api', '.env');

function get(headers) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/instance/fetchInstances', headers, timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => resolve({ code: res.statusCode, body }));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

(async () => {
  const m = fs.readFileSync(envFile, 'utf8').match(/^AUTHENTICATION_API_KEY=(.*)$/m);
  if (!m || !m[1].trim()) throw new Error('AUTHENTICATION_API_KEY ausente em evolution-api/.env (rode scripts/make-env.js)');
  const key = m[1].trim();

  const sem = await get({});
  console.log('sem chave: HTTP ' + sem.code + (sem.code === 401 ? ' (esperado)' : ' (ESPERADO 401)'));
  const com = await get({ apikey: key });
  console.log('com chave: HTTP ' + com.code + (com.code === 200 ? ' (esperado)' : ' (ESPERADO 200)'));
  if (com.code === 200) {
    const j = JSON.parse(com.body);
    const lista = Array.isArray(j) ? j : [];
    console.log('instâncias: ' + lista.length);
    for (const i of lista) {
      console.log('  - ' + (i.name ?? i.instance?.instanceName) + ': ' + (i.connectionStatus ?? i.instance?.status));
    }
  }
  if (sem.code !== 401 || com.code !== 200) process.exit(1);
})().catch((e) => {
  console.error('erro: ' + e.message);
  process.exit(1);
});
