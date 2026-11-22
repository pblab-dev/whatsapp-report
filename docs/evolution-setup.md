# Instalação da Evolution API (local)

Guia para subir a Evolution API localmente, usada para ler grupos e enviar relatórios via sessão WhatsApp Web.

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

- Dentro de `evolution-api/`, rode `node dist/main.js`.
- A API sobe na porta definida em `SERVER_PORT` (padrão 8080), apenas em 127.0.0.1.
- Para reiniciar após trocar o `.env`, pare o processo atual e suba de novo. Um processo antigo continua com a configuração anterior.

## 6. Validar a instalação

Faça uma requisição autenticada com o cabeçalho `apikey` (use a chave do seu `.env`, sem colá-la em lugar nenhum):

```
GET http://127.0.0.1:<SERVER_PORT>/instance/fetchInstances
header: apikey: <sua chave do .env>
```

- Resposta 200: instalação válida.
- Resposta 401: chave incorreta ou processo ainda com a configuração antiga.

## 7. Conectar o WhatsApp (somente com aprovação do dono)

- Criar instância e exibir QR code só quando o dono pedir. Nunca versionar QR code.
- Após conectar, listar os grupos ativos e o dono escolhe quais monitorar.

## 8. O que nunca vai para o repositório

- `.env`, `.pgpass`, pasta de dados do PostgreSQL, logs, sessões do WhatsApp e QR codes.
- Qualquer token, chave, senha ou valor parcial deles.

## 9. Checklist de segurança

- [ ] Senha do banco trocada e fora de logs.
- [ ] `.env` e `.pgpass` com permissão 600.
- [ ] API escutando apenas em 127.0.0.1.
- [ ] Chave de API regerada após qualquer exposição.
- [ ] Nenhum envio real sem aprovação explícita do dono, caso a caso.
