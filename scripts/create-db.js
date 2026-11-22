// Cria o banco da Evolution API no PostgreSQL local, se ainda não existir.
// Uso: node scripts/create-db.js
// Variáveis opcionais: PG_HOST (127.0.0.1), PG_PORT (5433), PG_USER (evo),
// PG_DATABASE (evolution_api), PG_PASSWORD_FILE (.pgpass na raiz do repo).
// Requer `npm ci` na raiz (módulo 'pg'). Nunca imprime a senha.
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const host = process.env.PG_HOST || '127.0.0.1';
const port = Number(process.env.PG_PORT || 5433);
const user = process.env.PG_USER || 'evo';
const database = process.env.PG_DATABASE || 'evolution_api';
const pwFile = process.env.PG_PASSWORD_FILE || path.join(__dirname, '..', '.pgpass');

(async () => {
  const password = fs.readFileSync(pwFile, 'utf8').trim();
  const client = new Client({ host, port, user, password, database: 'postgres' });
  await client.connect();
  try {
    const r = await client.query('select 1 from pg_database where datname = $1', [database]);
    if (r.rowCount === 0) {
      await client.query('create database "' + database.replace(/"/g, '') + '"');
      console.log('banco criado');
    } else {
      console.log('banco já existe');
    }
  } finally {
    await client.end();
  }
})().catch((e) => {
  console.error('erro:', e.message);
  process.exit(1);
});
