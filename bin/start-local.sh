#!/bin/sh
# Sobe o PostgreSQL (127.0.0.1:5433) e a Evolution API (127.0.0.1:8080) de forma idempotente.
# A Evolution escuta somente em localhost (via bin/localhost-only.cjs), sem exposição na rede.
# Não imprime segredos. Uso: sh bin/start-local.sh
set -u
BASE="$HOME/whatsapp-report"
PGBIN="$BASE/pg/node_modules/@embedded-postgres/linux-x64/native/bin"
LOGS="$BASE/logs"
mkdir -p "$LOGS"

if ss -ltn 2>/dev/null | grep -q '127.0.0.1:5433'; then
  echo "PostgreSQL já ativo na 5433"
else
  "$PGBIN/pg_ctl" -D "$BASE/pgdata" -l "$BASE/pg.log" -o "-p 5433 -c listen_addresses=127.0.0.1" -w -t 60 start >/dev/null 2>&1 && echo "PostgreSQL iniciado na 5433" || echo "Falha ao iniciar PostgreSQL (veja pg.log)"
fi

if ss -ltn 2>/dev/null | grep -q '127.0.0.1:8080'; then
  echo "Evolution API já ativa em 127.0.0.1:8080"
else
  cd "$BASE/evolution-api" && NODE_OPTIONS="--require $BASE/bin/localhost-only.cjs" nohup node dist/main.js >> "$LOGS/evolution-8080.log" 2>&1 &
  echo "Evolution API iniciada em 127.0.0.1:8080 (log em logs/evolution-8080.log)"
fi
