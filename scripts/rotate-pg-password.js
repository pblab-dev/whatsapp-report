// Troca a senha do usuário do PostgreSQL local e atualiza o arquivo de senha.
// Uso: node scripts/rotate-pg-password.js (depois rode scripts/make-env.js e reinicie a Evolution API)
// Nunca imprime a senha. Valida a nova senha antes de gravar o arquivo.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require(path.join(__dirname, '..', 'evolution-api', 'node_modules', 'pg'));

const host = process.env.PG_HOST || '127.0.0.1';
const port = Number(process.env.PG_PORT || 5433);
const user = process.env.PG_USER || 'evo';
const pwFile = process.env.PG_PASSWORD_FILE || path.join(__dirname, '..', '.pgpass');

(async () => {
  const oldPw = fs.readFileSync(pwFile, 'utf8').trim();
  const newPw = crypto.randomBytes(24).toString('hex');
  const admin = new Client({ host, port, user, password: oldPw, database: 'postgres' });
  await admin.connect();
  await admin.query('ALTER USER ' + user.replace(/[^a-zA-Z0-9_]/g, '') + " WITH PASSWORD '" + newPw + "'");
  await admin.end();
  const check = new Client({ host, port, user, password: newPw, database: 'postgres' });
  await check.connect();
  await check.query('select 1');
  await check.end();
  fs.writeFileSync(pwFile, newPw + '\n', { mode: 0o600 });
  console.log('senha trocada e validada (valor não exibido)');
})().catch((e) => {
  console.error('erro:', e.message);
  process.exit(1);
});
