# Instalação e operação da Evolution API (local)

Guia de operação da Evolution API local, usada para ler grupos e enviar relatórios via WhatsApp Web. Para o passo a passo do zero, veja `docs/bootstrap.md`.

> ⚠️ A Evolution API usa sessão de WhatsApp Web, que não é oficial. Há risco de bloqueio do número. Use número dedicado (recomendado, não obrigatório) e envios em volume baixo.

## 1. Controle dos processos (obrigatório)

Use sempre o script de controle, na raiz do repositório:

```
sh bin/start-local.sh start     # sobe PostgreSQL (5433) e Evolution API (8080)
sh bin/start-local.sh status    # mostra PIDs registrados e a escuta de cada porta
sh bin/start-local.sh stop      # encerra a Evolution e o PostgreSQL pelos PIDs registrados
sh bin/start-local.sh start-db  # só o PostgreSQL
sh bin/start-local.sh start-evo # só a Evolution
```

- Antes de subir, o script checa a porta e identifica o **dono** dela (o PID do processo que escuta). Se o dono não for o PID registrado, ele aborta e reporta. Não mate o processo às cegas: identifique o dono antes.
- Os PIDs ficam em `run/postgres.pid` e `run/evolution.pid`. Nunca suba um serviço sem registrar o PID.
- **PID obsoleto:** após reinício do computador, os arquivos em `run/` podem apontar para processos que não existem mais. Nesse caso a porta fica livre e o `start` sobe o serviço e regrava o PID. Se `status` mostrar uma porta em LISTEN sem PID registrado vivo, confirme de quem é o processo antes de agir: para o PostgreSQL, `pgdata/postmaster.pid` deve apontar para ele. Só então grave o PID real com `head -1 pgdata/postmaster.pid > run/postgres.pid`. Não faça isso com processos de outra origem.
- Parada: SIGTERM, espera até 30 s, depois SIGKILL. A parada usa os PIDs registrados, não as portas.
- Cada pasta de instalação tem uma só Evolution e um só PostgreSQL. Não troque `EVO_PORT` nem `PG_PORT` depois de subir.
- A Evolution escuta somente em `127.0.0.1` (via `bin/localhost-only.cjs`, carregado com `NODE_OPTIONS=--require`), sem alterar o código da Evolution.
- Logs: `logs/evolution-8080.log`, `logs/control.log`, `logs/pg.log`. Ficam fora do git.

### Por que essa regra existe

Uma subida manual da Evolution, feita sem checar a porta nem gravar o PID, deixou um processo órfão em `*:8080` (exposto na rede), sem como ser encerrado de forma controlada. A correção foi: checagem de porta e de dono, PID em arquivo, parada controlada e escuta em `127.0.0.1`. Processo sem controle deve ser reportado antes de qualquer ação.

## 2. Validar a instalação

```
sh bin/start-local.sh status
node scripts/check-api.js
```

- `status` deve mostrar PIDs vivos e as portas apenas em `127.0.0.1`.
- `check-api.js` faz duas requisições a `GET /instance/fetchInstances`: sem chave deve responder **401**, com a chave do `evolution-api/.env` deve responder **200**. A chave é lida em memória e nunca é impressa.
- Para conferir a escuta: `cat /proc/net/tcp` deve mostrar `0100007F:1F90` (127.0.0.1:8080) e `0100007F:1539` (127.0.0.1:5433), e nunca `00000000:1F90` (todas as interfaces).

## 3. Trocar segredos (rotação)

Faça a rotação sempre que um segredo aparecer em log, chat ou arquivo versionado.

1. `sh bin/start-local.sh stop`
2. `node scripts/rotate-pg-password.js`: troca a senha do usuário `evo` no PostgreSQL, valida a nova senha e regrava `.pgpass` (só a senha, 600).
3. `node scripts/make-env.js`: regrava `evolution-api/.env` com a nova URI do banco e uma nova chave de API (600).
4. Redija o valor antigo de todos os logs, se algum tiver aparecido.
5. `sh bin/start-local.sh start`, depois `node scripts/check-api.js`.

## 4. Criar a instância (somente com aprovação do dono)

- `POST /instance/create` com o corpo `{"instanceName": "whatsapp-report", "integration": "WHATSAPP-BAILEYS", "qrcode": false}` e o cabeçalho `apikey`.
- Sem QR code, a instância fica com status `close`, sem conexão ao WhatsApp.
- Monte o cabeçalho sem colar a chave em chat, log ou arquivo versionado.

## 5. Conectar o WhatsApp (somente quando o dono pedir)

- O QR code é exibido só quando o dono pedir. Nunca é salvo em arquivo ou log.
- Depois de conectar, liste os grupos ativos. O dono escolhe quais monitorar.
- Nenhum envio real acontece sem aprovação explícita do dono, caso a caso.

## 6. O que nunca vai para o repositório

- `.env`, `.pgpass`, `pgdata/`, `run/`, `logs/`, `evolution-api/`, sessões do WhatsApp e QR codes.
- Qualquer token, chave, senha ou valor parcial deles.

## 7. Checklist de segurança

- [ ] Senha do banco trocada após qualquer exposição.
- [ ] `.env` e `.pgpass` com permissão 600.
- [ ] Evolution escutando somente em `127.0.0.1:8080` (conferido com `status`).
- [ ] Chave de API regerada após qualquer exposição.
- [ ] Nenhum processo sem PID registrado.
- [ ] Nenhum envio real sem aprovação explícita do dono.
