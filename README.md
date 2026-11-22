# Whatsapp Report - Assistente Inteligente

SaaS de relatórios de grupos de WhatsApp. Coleta dados de grupos escolhidos pelo usuário, gera relatórios e os envia a destinatários pela Evolution API instalada localmente.

## Como começar (novo bot ou novo ambiente)

1. Clone este repositório e rode `npm ci` na raiz.
2. Leia, nesta ordem: `docs/decisoes.md` (decisões aprovadas pelo dono), `docs/regras.md` (regras de trabalho), `docs/instrucoes-bot.md` (instruções-base do bot) e `docs/bootstrap.md` (passo a passo do zero).
3. Siga `docs/bootstrap.md`. Ele usa os scripts de `scripts/` para criar a senha e o banco, gerar `evolution-api/.env` e validar a API.
4. Para operar e controlar os processos, use `docs/evolution-setup.md`.

Antes de qualquer instalação, atualize o clone com `git pull`.

## Regras para novos bots

- Este repositório é a fonte única de scripts, utilitários e documentação do projeto.
- Nunca versionar `.env`, `.pgpass`, chaves, tokens, senhas, sessões, QR codes, dumps ou logs com dados pessoais.
- Não criar script, util ou fluxo fora deste repositório sem registrá-lo aqui e em `docs/`.
- Criar instâncias, rotinas ou envios reais exige aprovação explícita do dono.

## Estrutura

- `docs/decisoes.md`: decisões de produto aprovadas pelo dono.
- `docs/regras.md`: regras de trabalho e de segurança.
- `docs/instrucoes-bot.md`: instruções-base para um bot novo, sem segredos.
- `docs/bootstrap.md`: passo a passo para inicializar o ambiente do zero.
- `docs/evolution-setup.md`: operação da Evolution API (controle de processos, validação, rotação de segredos).
- `docs/mapa-funcoes.md`: mapa de funções, observado publicamente e sem cópia de terceiros.
- `bin/start-local.sh`: sobe, para e mostra o status do PostgreSQL (5433) e da Evolution API (8080), somente em `127.0.0.1`.
- `bin/localhost-only.cjs`: força a Evolution a escutar só em `127.0.0.1`, sem alterar o código dela.
- `scripts/create-db.js`: cria o banco `evolution_api` no PostgreSQL local.
- `scripts/make-env.js`: gera `evolution-api/.env` com chave de API aleatória, sem exibir valores.
- `scripts/rotate-pg-password.js`: troca a senha do usuário do banco e atualiza o `.pgpass`.
- `scripts/check-api.js`: valida a Evolution (401 sem chave, 200 com chave), sem exibir a chave.
- `package.json` e `package-lock.json`: dependências fixadas (`pg` e PostgreSQL embutido).
- `.env.example`: variáveis do app, sem valores.

A Evolution API (código oficial, upstream, tag `2.3.7`) não é versionada aqui. Ela é clonada para `evolution-api/`, que está no `.gitignore`.

## Regras de segurança

- Nunca versionar tokens, chaves, senhas, sessões, QR codes, dumps de banco ou logs com dados pessoais.
- Dados de grupos e contatos não entram no repositório.
- A Evolution API usa sessão de WhatsApp Web (não oficial). Recomendamos número de WhatsApp normal (não Business), que reduz bastante o risco de bloqueio, e volume baixo.
- Criar instâncias, rotinas ou envios reais exige aprovação explícita do dono.

## Status

MVP implementado no branch `feat/mvp-produto`. Já estão prontos: ambiente local com PostgreSQL e Evolution API, controle de processos, validação da API, guia de bootstrap, coleta de grupos, métricas, relatórios, agendamento e envio pela Evolution, com travas. O envio é simulado por padrão. Envio real exige aprovação do destinatário, `WR_ALLOW_REAL_SEND=1` e `--real`. Teto: 1 relatório por dia por destinatário. Testes com servidor falso (`npm test`), sem WhatsApp real. Pendente: conexão do WhatsApp por QR code. Resumos e alertas (fase 2) e linguagem natural (fase 3) estão fora do MVP.

A Evolution API é o caminho único para leitura de grupos e envio de relatórios, em volume baixo no início. A Cloud API da Meta está fora do MVP e saiu deste repositório (permanece no histórico do git).
