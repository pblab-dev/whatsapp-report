# Instalação da Evolution API (local)

Guia para subir a Evolution API localmente, usada para ler grupos e enviar relatórios via WhatsApp Web.

> ⚠️ A Evolution API usa sessão de WhatsApp Web, que não é oficial. Há risco de bloqueio do número. Use número dedicado (recomendado, não obrigatório) e envios em volume baixo.

## 1. Pré-requisitos

- Node.js LTS e npm.
- PostgreSQL local. No ambiente de referência ele roda na porta 5433, apenas em 127.0.0.1.
- Não é necessário Docker.

## 2. Obter o código

- A Evolution API (v2.3.x) não faz parte deste repositório. Clone-a em `evolution-api/` dentro do diretório de trabalho.
- Dentro de `evolution-api/`: `npm install` e depois `npm run build`.

## 3. Senha e banco

- Crie um usuário local do PostgreSQL (`evo`) com uma senha forte.
- Grave a senha em `.pgpass` na raiz do projeto: **somente a senha, em uma linha**, com permissão 600. Os scripts de instalação leem o arquivo inteiro como senha. Esse arquivo nunca vai para o Git.
- Crie o banco `evolution_api` com `node scripts/create-db.js`.

## 4. Gerar o `.env`

- Rode `node scripts/make-env.js`. Ele usa `env.example`, grava `evolution-api/.env` com permissão 600 e gera uma chave de API aleatória.
- A chave de API e a senha nunca devem aparecer em chat, log ou arquivo versionado.

## 5. Controle dos processos (obrigatório)

Use sempre o script de controle:

```
sh bin/start-local.sh start     # sobe PostgreSQL (5433) e Evolution API (8080)
sh bin/start-local.sh status    # mostra PIDs registrados e a escuta de cada porta
sh bin/start-local.sh stop      # encerra a Evolution e o PostgreSQL pelos PIDs registrados
sh bin/start-local.sh start-db  # só o PostgreSQL
sh bin/start-local.sh start-evo # só a Evolution
```

- Antes de subir, o script checa a porta. Se ela estiver ocupada por um processo **sem PID registrado**, ele aborta e reporta. Não mate o processo às cegas: identifique o dono antes.
- Os PIDs ficam em `run/postgres.pid` e `run/evolution.pid`. Nunca suba um serviço sem registrar o PID.
- **PID obsoleto:** após reinício do computador, o arquivo de PID pode apontar para um processo que não existe mais. Se o `status` mostrar a porta 5433 em LISTEN sem PID vivo, confirme que o processo é do nosso cluster (o `pgdata/postmaster.pid` aponta para ele e o `-D` é `pgdata/`). Só então grave o PID real com `head -1 pgdata/postmaster.pid > run/postgres.pid`. Não faça isso com processos de outra origem.
- Parada: SIGTERM, espera até 30 s, depois SIGKILL.
- A Evolution escuta somente em `127.0.0.1:8080`, via `bin/localhost-only.cjs` carregado com `NODE_OPTIONS=--require`, sem alterar o código da Evolution.
- Logs: `logs/evolution-8080.log`, `logs/control.log` e `pg.log`. Não vão para o Git.
- Após reinício do computador, rode `sh bin/start-local.sh start`.

### Por que essa regra existe

Uma subida manual da Evolution, feita sem checar a porta nem gravar o PID, deixou um processo órfão em `*:8080` (exposto na rede), sem como ser encerrado de forma controlada. A correção foi: checagem de porta, PID em arquivo, parada controlada e escuta em `127.0.0.1`. Processo sem controle deve ser reportado antes de qualquer ação.

## 6. Validar a instalação

- `sh bin/start-local.sh status` deve mostrar PIDs vivos e a 8080 apenas em `127.0.0.1`.
- `ss -ltn` deve mostrar `127.0.0.1:8080` e `127.0.0.1:5433`, e nunca `*:8080`.
- Requisição autenticada: `GET http://127.0.0.1:8080/instance/fetchInstances` com o cabeçalho `apikey`. Monte o cabeçalho a partir do `.env` em arquivo temporário, sem colar a chave em lugar nenhum, e apague o arquivo depois.
  - 200: instalação válida.
  - 401: chave incorreta ou processo com configuração antiga (reinicie com `stop` e `start`).
- Teste externo: a 8080 deve recusar conexão pelo IP da rede.

## 7. Trocar segredos (rotação)

Faça a rotação sempre que um segredo aparecer em log, chat ou arquivo versionado. O repositório traz `scripts/rotate-pg-password.js` para a troca da senha do banco.

1. Troque a senha do usuário `evo` no PostgreSQL (`ALTER USER`), com senha gerada de forma aleatória (`scripts/rotate-pg-password.js`).
2. Valide a nova senha com uma conexão de teste.
3. Atualize a URI de `DATABASE_CONNECTION_URI` no `.env` e regrave `.pgpass` (só a senha, 600).
4. Regere `AUTHENTICATION_API_KEY` (aleatória, 600) no `.env`, ou rode `make-env.js` de novo.
5. Redija o valor antigo de todos os logs.
6. Reinicie com `sh bin/start-local.sh stop` e depois `sh bin/start-local.sh start`.

## 8. Conectar o WhatsApp (somente com aprovação do dono)

- Criar instância: pode ser feita sem QR code (`qrcode: false` em `POST /instance/create`). Ela fica com status `close`, sem conexão ao WhatsApp.
- Exibir QR code só quando o dono pedir. Nunca versione QR code.
- Após conectar, liste os grupos ativos e o dono escolhe quais monitorar.
- Nenhum envio real acontece sem aprovação explícita do dono, caso a caso.

## 9. O que nunca vai para o repositório

- `.env`, `.pgpass`, `pgdata/`, `run/`, `logs/`, sessões do WhatsApp e QR codes.
- Qualquer token, chave, senha ou valor parcial deles.

## 10. Checklist de segurança

- [ ] Senha do banco trocada após qualquer exposição.
- [ ] `.env` e `.pgpass` com permissão 600.
- [ ] Evolution escutando somente em `127.0.0.1:8080` (confirmado com `ss`).
- [ ] Chave de API regerada após qualquer exposição.
- [ ] Nenhum processo sem PID registrado.
- [ ] Nenhum envio real sem aprovação explícita do dono.
