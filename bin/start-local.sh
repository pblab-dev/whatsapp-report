#!/bin/sh
# Controle dos processos locais do WhatsApp Report: PostgreSQL (127.0.0.1:$PG_PORT) e Evolution API (127.0.0.1:$EVO_PORT).
# Uso: sh bin/start-local.sh {start|stop|status|start-db|start-evo}
#
# O diretório base é o próprio repositório (o script fica em bin/). Pré-requisito: `npm ci` na raiz.
# Variáveis opcionais: PG_PORT (padrão 5433) e EVO_PORT (padrão 8080). Use os mesmos valores
# ao rodar scripts/make-env.js, porque eles gravam as portas no evolution-api/.env.
# Cada pasta de instalação tem uma só Evolution e um só PostgreSQL. Não troque as portas depois de subir.
#
# Regras de controle (obrigatórias):
#  - Antes de subir, checa se a porta está livre e de quem é. Se o dono não for o PID registrado, ABORTA e reporta.
#  - Grava o PID em run/*.pid. Nunca sobe um processo sem registro.
#  - Parada: SIGTERM, aguarda até 30 s, depois SIGKILL.
#  - Escuta somente em 127.0.0.1 (bin/localhost-only.cjs força isso para a Evolution).
#  - Portas e donos são lidos em /proc (Linux), sem depender do comando ss.
# Nunca imprime segredos (.env, .pgpass, chaves).
set -u

BASE="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="$BASE/node_modules/@embedded-postgres/linux-x64/native/bin"
PGDATA="$BASE/pgdata"
RUN="$BASE/run"
LOGS="$BASE/logs"
PG_PIDFILE="$RUN/postgres.pid"
EVO_PIDFILE="$RUN/evolution.pid"
PG_PORT="${PG_PORT:-5433}"
EVO_PORT="${EVO_PORT:-8080}"
GRACE=30

mkdir -p "$RUN" "$LOGS"

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "$(now) $*" >> "$LOGS/control.log"; echo "$*"; }

# Inode do socket em LISTEN na porta (IPv4 e IPv6), lido de /proc/net/tcp e /proc/net/tcp6.
port_inode() {
  p="$(printf '%04X' "$1")"
  awk -v p="$p" 'FNR>1 && $4=="0A" { n=split($2,a,":"); if (toupper(a[n])==p) { print $10; exit } }' /proc/net/tcp /proc/net/tcp6 2>/dev/null
}
# Retorna 0 se a porta está em LISTEN (qualquer endereço).
port_busy() { [ -n "$(port_inode "$1")" ]; }
# Imprime o PID dono do socket da porta (vazio se não for possível identificar).
port_owner_pid() {
  inode="$(port_inode "$1")"
  [ -n "$inode" ] || return 0
  for fd in /proc/[0-9]*/fd/*; do
    if [ "$(readlink "$fd" 2>/dev/null)" = "socket:[$inode]" ]; then
      pid="${fd#/proc/}"; pid="${pid%%/*}"; echo "$pid"; return 0
    fi
  done
}
# Retorna 0 se a porta escuta somente em 127.0.0.1 (IPv4 0100007F ou IPv6 ::1).
port_local_only() {
  p="$(printf '%04X' "$1")"
  addrs="$(awk -v p="$p" 'FNR>1 && $4=="0A" { n=split($2,a,":"); if (toupper(a[n])==p) print a[1] }' /proc/net/tcp /proc/net/tcp6 2>/dev/null)"
  [ -n "$addrs" ] || return 1
  bad="$(printf '%s\n' "$addrs" | grep -v -E '^(0100007F|00000000000000000000000001000000)$')"
  [ -z "$bad" ]
}
# Retorna 0 se o PID do arquivo existe e está vivo.
pid_alive() { [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }

# Decide o que fazer com a porta. 0 = livre (pode subir); 2 = já é o nosso processo registrado (não sobe de novo); 1 = aborta.
port_state() {
  port="$1"; pidfile="$2"; name="$3"
  port_busy "$port" || return 0
  owner="$(port_owner_pid "$port")"
  if pid_alive "$pidfile" && [ -n "$owner" ] && [ "$owner" = "$(cat "$pidfile")" ]; then
    echo "$name já ativo na $port (PID $owner)"; return 2
  fi
  log "ABORTADO: porta $port ocupada pelo PID ${owner:-desconhecido}, que não é o PID registrado de $name"
  return 1
}

# Para um processo pelo PID registrado: SIGTERM, espera GRACE s, depois SIGKILL.
stop_pid() {
  pidfile="$1"; name="$2"
  if ! pid_alive "$pidfile"; then
    rm -f "$pidfile"; echo "$name: sem processo registrado ativo"; return 0
  fi
  pid="$(cat "$pidfile")"
  log "Parando $name (PID $pid) com SIGTERM"
  kill -TERM "$pid" 2>/dev/null
  i=0
  while kill -0 "$pid" 2>/dev/null && [ "$i" -lt "$GRACE" ]; do sleep 1; i=$((i + 1)); done
  if kill -0 "$pid" 2>/dev/null; then
    log "$name (PID $pid) não saiu em ${GRACE}s; enviando SIGKILL"
    kill -KILL "$pid" 2>/dev/null
    sleep 1
  fi
  rm -f "$pidfile"
  if kill -0 "$pid" 2>/dev/null; then log "ERRO: $name (PID $pid) ainda ativo"; return 1; fi
  log "$name parado"
}

start_pg() {
  if [ ! -x "$PGBIN/pg_ctl" ]; then echo "PostgreSQL não encontrado. Rode 'npm ci' na raiz do projeto."; return 1; fi
  if [ ! -f "$PGDATA/PG_VERSION" ]; then echo "Cluster do PostgreSQL inexistente. Rode o passo 3 do docs/bootstrap.md (initdb)."; return 1; fi
  port_state "$PG_PORT" "$PG_PIDFILE" PostgreSQL; st=$?
  [ "$st" = 2 ] && return 0
  [ "$st" = 1 ] && return 1
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$LOGS/pg.log" -o "-p $PG_PORT -c listen_addresses=127.0.0.1" -w -t 60 start >/dev/null 2>&1 || { log "Falha ao iniciar PostgreSQL (veja logs/pg.log)"; return 1; }
  head -1 "$PGDATA/postmaster.pid" > "$PG_PIDFILE"
  log "PostgreSQL iniciado na $PG_PORT (PID $(cat "$PG_PIDFILE"))"
}

stop_pg() {
  if ! pid_alive "$PG_PIDFILE"; then echo "PostgreSQL: sem processo registrado ativo"; rm -f "$PG_PIDFILE"; return 0; fi
  pid="$(cat "$PG_PIDFILE")"
  log "Parando PostgreSQL (PID $pid) com pg_ctl -m fast"
  "$PGBIN/pg_ctl" -D "$PGDATA" -m fast -w -t "$GRACE" stop >/dev/null 2>&1
  if kill -0 "$pid" 2>/dev/null; then stop_pid "$PG_PIDFILE" PostgreSQL; return; fi
  rm -f "$PG_PIDFILE"; log "PostgreSQL parado"
}

start_evo() {
  if [ ! -f "$BASE/evolution-api/dist/main.js" ]; then echo "Evolution API não compilada. Rode o passo 5 do docs/bootstrap.md."; return 1; fi
  port_state "$EVO_PORT" "$EVO_PIDFILE" "Evolution API"; st=$?
  [ "$st" = 2 ] && return 0
  [ "$st" = 1 ] && return 1
  cd "$BASE/evolution-api" || return 1
  SERVER_PORT="$EVO_PORT" NODE_OPTIONS="--require $BASE/bin/localhost-only.cjs" nohup node dist/main.js >> "$LOGS/evolution-$EVO_PORT.log" 2>&1 &
  echo $! > "$EVO_PIDFILE"
  log "Evolution API iniciada (PID $(cat "$EVO_PIDFILE")), aguardando porta $EVO_PORT"
  i=0
  while [ "$i" -lt 60 ]; do
    port_busy "$EVO_PORT" && break
    pid_alive "$EVO_PIDFILE" || { log "Evolution API encerrou ao subir (veja logs/evolution-$EVO_PORT.log)"; rm -f "$EVO_PIDFILE"; return 1; }
    sleep 1; i=$((i + 1))
  done
  if port_local_only "$EVO_PORT"; then log "Evolution API escutando somente em 127.0.0.1:$EVO_PORT"; else log "ALERTA: $EVO_PORT não está restrita a 127.0.0.1"; return 1; fi
}

stop_evo() { stop_pid "$EVO_PIDFILE" "Evolution API"; }

status() {
  echo "== PostgreSQL ($PG_PORT)"
  pid_alive "$PG_PIDFILE" && echo "  PID registrado: $(cat "$PG_PIDFILE") (vivo)" || echo "  sem PID registrado ativo"
  if port_busy "$PG_PORT"; then echo "  porta: em LISTEN (dono: PID $(port_owner_pid "$PG_PORT"))"; else echo "  porta: livre"; fi
  echo "== Evolution API ($EVO_PORT)"
  pid_alive "$EVO_PIDFILE" && echo "  PID registrado: $(cat "$EVO_PIDFILE") (vivo)" || echo "  sem PID registrado ativo"
  if port_busy "$EVO_PORT"; then
    port_local_only "$EVO_PORT" && echo "  porta: LISTEN somente em 127.0.0.1 (dono: PID $(port_owner_pid "$EVO_PORT"))" || echo "  porta: LISTEN em endereço NÃO local (ALERTA)"
  else
    echo "  porta: livre"
  fi
}

case "${1:-}" in
  start) start_pg && start_evo ;;
  start-db) start_pg ;;
  start-evo) start_evo ;;
  stop) stop_evo; stop_pg ;;
  status) status ;;
  *) echo "Uso: sh bin/start-local.sh {start|stop|status|start-db|start-evo}"; exit 2 ;;
esac
