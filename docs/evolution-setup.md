# Instalação da Evolution API (local)

Guia para subir a Evolution API localmente, usada para ler grupos e enviar relatórios via WhatsApp Web.

> ⚠️ A Evolution API usa sessão de WhatsApp Web, que não é oficial. Há risco de bloqueio do número. Use número dedicado (recomendado, não obrigatório) e envios em volume baixo.

## 1. Pré-requisitos

- Node.js LTS e npm.
- PostgreSQL local. No ambiente de referência ele roda na porta 5433, apenas em 127.0.0.1.
- Não é necessário Docker.

## 2. Obter o código

- Clone a Evolution API (v2.3.x) em `evolution-api/` dentro do diretório de trabalho do projeto.
- Instale as dependências com `npm install` dentro de `evolution-api/`.
- Gere o build com `npm run build`.

## 3. Criar a senha e o banco

- Crie um usuário local do PostgreSQL (`evo`) com uma senha forte.
- Grave a senha em um arquivo `.pgpass` na raiz do projeto, com permissão 600. Esse arquivo nunca vai para o Git.
- Crie o banco `evolution_api` com `node scripts/create-db.js`.

## 4. Gerar o `.env`

- Rode `node scripts/make-env.js`. O script usa `env.example`, grava o `.env` com permissão 600 e gera uma chave de API aleatória.
- A chave de API e a senha nunca devem aparecer em chat, log ou arquivo versionado.
- Para trocar a senha do banco, use `node scripts/rotate-pg-password.js` e depois rode `make-env.js` de novo.

## 5. Subir o serviço

- Use o script idempotente: `sh bin/start-local.sh`. Ele sobe o PostgreSQL (5433) e a Evolution API somente se ainda não estiverem ativos.
- A Evolution escuta somente em `127.0.0.1:8080`. Isso é feito pelo módulo `bin/localhost-only.cjs`, carregado via `NODE_OPTIONS=--require`, sem alterar o código da Evolution. Assim a porta não fica acessível pela rede.
- Logs ficam em `logs/evolution-8080.log`, que não vai para o Git.
- Após reinício do computador, rode `sh bin/start-local.sh` novamente.
- Para reiniciar com a configuração nova, encerre o processo atual da Evolution e rode o script de novo. Um processo antigo continua com a configuração anterior.

## 6. Validar a instalação

Faça uma requisição autenticada com o cabeçalho `apikey` (use a chave do seu `.env`, sem colá-la em lugar nenhum):

```
GET http://127.0.0.1:8080/instance/fetchInstances
header: apikey: <sua chave do .env>
```

- Resposta 200: instalação válida.
- Resposta 401: chave incorreta, ou processo ainda com a configuração antiga.
- Confirme a escuta local com `ss -ltn`: deve aparecer `127.0.0.1:8080`, e não `*:8080`.

## 7. Conectar o WhatsApp (somente com aprovação do dono)

- Criar instância e exibir QR code só quando o dono pedir. Nunca versione QR code.
- Após conectar, liste os grupos ativos e o dono escolhe quais monitorar.
- Nenhum envio real acontece sem aprovação explícita, caso a caso.

## 8. O que nunca vai para o repositório

- `.env`, `.pgpass`, dados do PostgreSQL (`pgdata/`), logs, sessões do WhatsApp e QR codes.
- Qualquer token, chave, senha ou valor parcial deles.

## 9. Checklist de segurança

- [ ] Senha do banco trocada e fora de logs.
- [ ] `.env` e `.pgpass` com permissão 600.
- [ ] Evolution escutando somente em `127.0.0.1:8080`.
- [ ] Chave de API regerada após qualquer exposição.
- [ ] Nenhum envio real sem aprovação explícita do dono.
