# Produto MVP: coleta, métricas, relatórios, agendamento e envio

Registro do código do MVP (regra 6 de `docs/regras.md`). Não contém segredos.

## Módulos (`src/`)

| Arquivo | Função |
|---|---|
| `config.js` | Configuração. Aceita só `127.0.0.1`/`localhost`. Lê a chave da Evolution do `.env` em memória. |
| `evolution.js` | Cliente HTTP da Evolution (`fetchGroups`, `findMessages`, `sendText`). Chave só no header. |
| `collect.js` | Coleta de metadados de mensagens (paginada, sem duplicar) e snapshots de participantes. |
| `store.js` | Armazenamento em `data/` (JSON, escrita atômica, modo 600), salt e pseudonimização HMAC. |
| `metrics.js` | Painel (volume, ativos vs. inativos, pico por hora local, comparação) e churn (saídas, entradas, retenção, em risco, saídas em massa, permanência observada). |
| `report.js` | Texto do relatório no formato padrão do projeto. |
| `schedule.js` | Horários (`nightly`, `twice`, `HH:MM,...`), janela de envio, teto diário e pausa mínima. Funções puras. |
| `sender.js` | Envio com travas em cascata (ver abaixo). |
| `cli.js` | Comandos da operação. |

## Comandos (`node src/cli.js <comando>`)

Rodar a partir de `work/whatsapp-report` (ou da pasta de instalação) com `EVOLUTION_ENV_FILE` apontando para o `.env` da Evolution, se necessário.

| Comando | O que faz | Escreve algo? |
|---|---|---|
| `groups` | Lista grupos ativos da conta conectada | Não |
| `select-groups --jids a@g.us,b@g.us` | Define os grupos monitorados (após o dono/usuário escolher) | `data/config.json` |
| `add-recipient --id X --type group\|user --target T --name N --schedule nightly --groups ... --period-days 7` | Cria destinatário sem aprovação | `data/config.json` |
| `approve-recipient --id X --by "Nome"` | Registra aprovação explícita | `data/config.json` |
| `collect` | Coleta mensagens (metadados) e participantes | `data/store.json` |
| `report --days 7` | Imprime o relatório no terminal. Não envia nada. | Não |
| `run [--real]` | Coleta e envia para destinatários aprovados com horário vencido | `data/store.json` |
| `status` | Resumo local, sem números nem chaves | Não |

## Travas do envio (`src/sender.js`)

Em ordem. Se qualquer trava falhar, o envio não acontece:

1. Destinatário com `approved: true`, `approval.by` e `approval.at`.
2. Dentro da janela de envio (08h às 22h, fuso `America/Fortaleza`).
3. Teto de 1 relatório por dia por destinatário (conta só envios `sent`).
4. Pausa mínima entre envios (`WR_MIN_GAP_SECONDS`, mínimo 60 s).
5. Envio real só com `WR_ALLOW_REAL_SEND=1` **e** `--real`. Sem isso, o status é `simulated` e nada chega à Evolution.

Cada envio real exige aprovação do dono, caso a caso (`docs/regras.md`, regra 2).

## Dados e privacidade

- `data/` está no `.gitignore`. Nunca versionar.
- Mensagens: guarda só id, horário, tipo e remetente pseudonimizado. Não guarda texto.
- Participantes: guardados como pseudônimo HMAC. O salt fica em `data/.salt` (modo 600).
- `data/config.json` contém os números dos destinatários. Não versionar.

## Testes

```
npm test
```

Usa `node:test` (Node 24) e um servidor falso da Evolution em `127.0.0.1`. Nenhum teste fala com WhatsApp real, e nenhum teste envia mensagem. Cobertura: configuração e loopback, cliente HTTP, paginação e deduplicação de coleta, métricas com cenário conhecido, formato do relatório, agendamento, todas as travas de envio, e o fluxo completo pela CLI.

## Limitações conhecidas

- Armazenamento em JSON local. A migração para o PostgreSQL local fica para a fase seguinte.
- Histórico limitado ao que a Evolution guardou desde a conexão do número.
- Saídas e entradas são detectadas por comparação de snapshots. Movimentos que se anulam entre duas coletas não aparecem.
- Permanência média só para membros cuja entrada foi observada.
- A Evolution usa sessão de WhatsApp Web, não oficial. Risco de bloqueio: alerta ao dono.
- Ainda não há agendador automático (cron). O `run` deve ser chamado por uma rotina aprovada pelo dono.
- Formato Power BI ou banco: não implementado.
- Teto de 1 relatório por dia: aguarda confirmação do dono (ver `docs/decisoes.md`).
