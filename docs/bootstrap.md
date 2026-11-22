# Bootstrap do projeto (novo bot ou novo ambiente)

Este guia sobe o ambiente do zero em um computador Linux, do clone do repositório até a Evolution API respondendo em `127.0.0.1:8080`. O repositório é a fonte da verdade, e nada aqui deve conter segredos.

> ⚠️ A Evolution API usa sessão de WhatsApp Web, que não é oficial. Há risco de bloqueio do número. Use um número de WhatsApp normal (não Business), que reduz bastante o risco de bloqueio, e envios em volume baixo.

## 1. Pré-requisitos

- Linux (a checagem de portas lê `/proc/net/tcp`).
- Git e acesso de leitura ao repositório público `pblab-dev/whatsapp-report`.
- Node.js 24 e npm (a imagem oficial da Evolution 2.3.7 também usa Node 24).
- Não é preciso instalar PostgreSQL no sistema: o projeto usa o PostgreSQL embutido, instalado pelo `npm ci`.
- Não é preciso Docker.

Portas usadas, sempre só em `127.0.0.1`:

| Serviço | Porta padrão | Variável opcional |
|---|---|---|
| PostgreSQL | 5433 | `PG_PORT` |
| Evolution API | 8080 | `EVO_PORT` (e `SERVER_PORT` no `make-env.js`) |

Use as mesmas variáveis em todos os passos. Os valores são gravados no `evolution-api/.env` no passo 5.

## 2. Obter o repositório e as dependências

```
git clone https://github.com/pblab-dev/whatsapp-report.git
cd whatsapp-report
npm ci
```

`npm ci` instala, na raiz, `pg` (cliente do banco) e `@embedded-postgres/linux-x64` (binários do PostgreSQL), nas versões fixadas em `package.json` e `package-lock.json`.

Avisos do npm sobre `install-scripts` (de `@embedded-postgres/linux-x64`, `sharp`, `esbuild` ou `prisma`) são esperados. O teste em clone limpo funcionou sem aprová-los.

Leia também `docs/decisoes.md` (decisões aprovadas pelo dono) e `docs/regras.md` (regras de trabalho).

## 3. Senha do banco e cluster do PostgreSQL

Gere a senha do banco localmente, sem exibi-la, em `.pgpass` (só a senha, uma linha, permissão 600):

```
node -e "require('fs').writeFileSync('.pgpass', require('crypto').randomBytes(24).toString('hex') + '\n', { mode: 0o600 })"
```

Crie o cluster do banco com o usuário `evo`, usando autenticação `scram-sha-256` (nunca `trust`):

```
node_modules/@embedded-postgres/linux-x64/native/bin/initdb -D pgdata -U evo --pwfile=.pgpass --auth=scram-sha-256 -E UTF8
```

O `pgdata/` nasce fora do git. Rode este passo só uma vez por ambiente. Se o `pgdata/` já existir, pule para o passo 4.

## 4. Subir o PostgreSQL e criar o banco

```
sh bin/start-local.sh start-db
node scripts/create-db.js
```

- `create-db.js` cria o banco `evolution_api`. Se ele já existir, apenas informa isso.
- Não imprime a senha.

## 5. Clonar, configurar e compilar a Evolution API (v2.3.7)

```
git clone --depth 1 --branch 2.3.7 https://github.com/evolution-foundation/evolution-api.git evolution-api
cd evolution-api && npm ci && cd ..
node scripts/make-env.js
cd evolution-api && npm run db:generate && npm run db:deploy && npm run build && cd ..
```

- `evolution-api/` é o código oficial da Evolution (upstream), na tag `2.3.7`. Não é versionado aqui (está no `.gitignore`).
- `make-env.js` grava `evolution-api/.env` com permissão 600, usa a senha de `.pgpass` e gera uma chave de API aleatória. Não exibe valores.
- `db:generate` gera o cliente Prisma; `db:deploy` aplica as migrações no banco `evolution_api`; `build` compila para `dist/`.
- O `.env` da raiz é do app (ainda não implementado). A Evolution usa só o `evolution-api/.env`.

## 6. Subir a Evolution API (somente em 127.0.0.1)

```
sh bin/start-local.sh start
sh bin/start-local.sh status
```

- O script checa a porta antes de subir, grava os PIDs em `run/` e escuta somente em `127.0.0.1` (via `bin/localhost-only.cjs`).
- `status` deve mostrar os dois PIDs vivos e as duas portas como `LISTEN somente em 127.0.0.1`.
- Controle completo, incluindo parada e processos sem PID, está em `docs/evolution-setup.md`.

## 7. Validar a instalação (sem exibir a chave)

```
node scripts/check-api.js
```

Esperado: `sem chave: HTTP 401 (esperado)` e `com chave: HTTP 200 (esperado)`. Só então considere o ambiente pronto. A saída mostra apenas códigos e nomes de instância, nunca a chave.

## 8. Criar a instância do WhatsApp (somente com aprovação do dono)

- Criar instância exige aprovação explícita do dono.
- Corpo do `POST /instance/create`: `{"instanceName": "whatsapp-report", "integration": "WHATSAPP-BAILEYS", "qrcode": false}`. Sem QR code, a instância fica com status `close`, sem conexão ao WhatsApp.
- A chave de API deve ser usada sem colar em chat, log ou arquivo.

## 9. Conectar o WhatsApp (somente quando o dono pedir)

- O QR code só é exibido quando o dono pedir. Nunca é salvo em arquivo ou log.
- Depois de conectar, liste os grupos ativos. O dono escolhe quais monitorar.
- Nenhum envio real acontece sem aprovação explícita do dono, caso a caso.

## 10. Reiniciar o computador

Depois de reiniciar, o PostgreSQL e a Evolution param. Rode de novo:

```
sh bin/start-local.sh start
sh bin/start-local.sh status
node scripts/check-api.js
```

Os PIDs antigos em `run/` ficam obsoletos. O script trata isso sozinho (ver `docs/evolution-setup.md`).

## 11. Trocar segredos

Faça a rotação sempre que um segredo aparecer em log, chat ou arquivo versionado:

```
sh bin/start-local.sh stop
node scripts/rotate-pg-password.js
node scripts/make-env.js
sh bin/start-local.sh start
node scripts/check-api.js
```

A chave de API muda com o `make-env.js`. As instâncias continuam no banco. Só as chamadas à API precisam da chave nova.

## 12. Regras de segurança

- Nunca versionar `.env`, `.pgpass`, `pgdata/`, `run/`, `logs/`, `evolution-api/`, chaves, tokens, sessões, QR codes, dumps ou logs com dados pessoais.
- Nunca imprimir segredos, nem parcialmente, em chat, log ou arquivo.
- Nenhuma mensagem real no WhatsApp sem aprovação explícita do dono, caso a caso.
- Criar instâncias, rotinas ou envios reais exige aprovação do dono.
- O alerta de risco de bloqueio é dado somente ao dono, não ao usuário final.
- A Cloud API da Meta está fora do MVP e não faz parte deste guia.
