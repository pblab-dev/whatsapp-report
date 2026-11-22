// Gera evolution-api/.env a partir de env.example, com chave de API aleatória.
// Uso: node scripts/make-env.js
// Nunca imprime valores. O arquivo sai com permissão 600 e não vai para o git.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'evolution-api');
const pwFile = process.env.PG_PASSWORD_FILE || path.join(root, '.pgpass');
const pgHost = process.env.PG_HOST || '127.0.0.1';
const pgPort = process.env.PG_PORT || '5433';
const pgUser = process.env.PG_USER || 'evo';
const pgDb = process.env.PG_DATABASE || 'evolution_api';
const port = process.env.SERVER_PORT || '8080';

const pw = fs.readFileSync(pwFile, 'utf8').trim();
let env = fs.readFileSync(path.join(dir, 'env.example'), 'utf8');

const set = (k, v) => {
  const re = new RegExp('^' + k + '=.*$', 'm');
  if (re.test(env)) env = env.replace(re, k + '=' + v);
  else env += '\n' + k + '=' + v;
};

set('SERVER_URL', 'http://localhost:' + port);
set('SERVER_PORT', port);
set('DATABASE_PROVIDER', 'postgresql');
set('DATABASE_CONNECTION_URI', 'postgresql://' + pgUser + ':' + encodeURIComponent(pw) + '@' + pgHost + ':' + pgPort + '/' + pgDb + '?schema=public');
set('CACHE_REDIS_ENABLED', 'false');
set('CACHE_LOCAL_ENABLED', 'true');
set('AUTHENTICATION_API_KEY', crypto.randomBytes(24).toString('hex'));
set('WEBHOOK_GLOBAL_ENABLED', 'false');
set('SERVER_DISABLE_DOCS', 'false');
set('DEL_INSTANCE', 'false');

fs.writeFileSync(path.join(dir, '.env'), env, { mode: 0o600 });
console.log('.env gerado (valores não exibidos)');
