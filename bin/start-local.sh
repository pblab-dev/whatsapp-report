#!/bin/sh
# Controle dos processos locais do WhatsApp Report: PostgreSQL (127.0.0.1:5433) e Evolution API (127.0.0.1:8080).
# Uso: sh bin/start-local.sh {start|stop|status|start-db|start-evo}
#
# Regras de controle (obrigatórias):
#  - Antes de subir, checa se a porta está livre; se estiver ocupada por processo sem PID registrado, ABORTA e reporta.
#  - Grava o PID em run/*.pid. Nunca sobe um processo sem registro.
#  - Parada: SIGTERM, aguarda até 30 s, depois SIGKILL.
#  - Escuta somente em 127.0.0.1 (bin/localhost-only.cjs força isso para a Evolution).
# Nunca imprime segredos (.env, .pgpass, chaves).
set -u

BASE="$HOME/whatsapp-report"
PGBIN="$BASE/pg/node_modules/@embedded-postgres/linux-x64/native/bin"
PGDATA="$BASE/pgdata"
RUN="$BASE/run"
LOGS="$BASE/logs"
PG_PIDFILE="$RUN/postgres.pid"
EVO_PIDFILE="$RUN/evolution.pid"
PG_PORT=5433
EVO_PORT=8080
GRACE=30

mkdir -p "$RUN" "$LOGS"

now() { date -u +%Y-%m-%dT%H:%M:%SZ; }
log() { echo "$(now) $*" >> "$LOGS/control.log"; echo "$*"; }

# Retorna 0 se a porta está em LISTEN (qualquer endereço).
port_busy() { ss -ltn 2>/dev/null | grep -q ":$1 "; }
# Retorna 0 se a porta escuta somente em 127.0.0.1.
port_local_only() { ss -ltn 2>/dev/null | grep -q "127.0.0.1:$1 " && ! ss -ltn 2>/dev/null | grep -qE "(0\.0\.0\.0|\*|\[::\]):$1 "; }
# Retorna 0 se o PID do arquivo existe e está vivo.
pid_alive() { [ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null; }

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
  kill -0 "$pid" 2>/dev/null && { log "ERRO: $name (PID $pid) ainda ativo"; return 1; }
  log "$name parado"
}

start_pg() {
  if port_busy "$PG_PORT"; then
    if pid_alive "$PG_PIDFILE"; then echo "PostgreSQL já ativo na $PG_PORT (PID $(cat "$PG_PIDFILE"))"; return 0; fi
    log "ABORTADO: porta $PG_PORT ocupada por processo sem PID registrado"; return 1
  fi
  "$PGBIN/pg_ctl" -D "$PGDATA" -l "$BASE/pg.log" -o "-p $PG_PORT -c listen_addresses=127.0.0.1" -w -t 60 start >/dev/null 2>&1 || { log "Falha ao iniciar PostgreSQL (veja pg.log)"; return 1; }
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
  if port_busy "$EVO_PORT"; then
    if pid_alive "$EVO_PIDFILE"; then echo "Evolution API já ativa na $EVO_PORT (PID $(cat "$EVO_PIDFILE"))"; return 0; fi
    log "ABORTADO: porta $EVO_PORT ocupada por processo sem PID registrado"; return 1
  fi
  cd "$BASE/evolution-api" || return 1
  NODE_OPTIONS="--require $BASE/bin/localhost-only.cjs" nohup node dist/main.js >> "$LOGS/evolution-8080.log" 2>&1 &
  echo $! > "$EVO_PIDFILE"
  log "Evolution API iniciada (PID $(cat "$EVO_PIDFILE")), aguardando porta $EVO_PORT"
  i=0
  while [ "$i" -lt 60 ]; do
    port_busy "$EVO_PORT" && break
    pid_alive "$EVO_PIDFILE" || { log "Evolution API encerrou ao subir (veja logs/evolution-8080.log)"; rm -f "$EVO_PIDFILE"; return 1; }
    sleep 1; i=$((i + 1))
  done
  if port_local_only "$EVO_PORT"; then log "Evolution API escutando somente em 127.0.0.1:$EVO_PORT"; else log "ALERTA: $EVO_PORT não está restrita a 127.0.0.1"; return 1; fi
}

stop_evo() { stop_pid "$EVO_PIDFILE" "Evolution API"; }

status() {
  echo "== PostgreSQL ($PG_PORT)"
  pid_alive "$PG_PIDFILE" && echo "  PID registrado: $(cat "$PG_PIDFILE") (vivo)" || echo "  sem PID registrado ativo"
  port_busy "$PG_PORT" && echo "  porta: em LISTEN" || echo "  porta: livre"
  echo "== Evolution API ($EVO_PORT)"
  pid_alive "$EVO_PIDFILE" && echo "  PID registrado: $(cat "$EVO_PIDFILE") (vivo)" || echo "  sem PID registrado ativo"
  if port_busy "$EVO_PORT"; then
    port_local_only "$EVO_PORT" && echo "  porta: LISTEN somente em 127.0.0.1" || echo "  porta: LISTEN em endereço NÃO local (ALERTA)"
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
