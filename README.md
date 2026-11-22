# Whatsapp Report - Assistente Inteligente

SaaS de relatórios de grupos de WhatsApp. Coleta dados de grupos escolhidos pelo usuário, gera relatórios e os envia a destinatários pela Evolution API instalada localmente.

## Regra de consumo (novos bots)

Este repositório é a fonte única de scripts, utilitários e documentação do projeto. Todo bot novo, ou todo bot que reinicializar, deve:

1. Clonar `github.com/pblab-dev/whatsapp-report` (ou atualizar com `git pull`) antes de qualquer instalação.
2. Ler `docs/decisoes.md` (decisões aprovadas pelo dono) e `docs/bootstrap.md` (passo a passo).
3. Copiar `.env.example` para `.env` local e preencher apenas valores locais. O `.env` nunca vai para o git.
4. Usar os scripts da pasta `scripts/` para criar o banco e gerar o `.env` da Evolution API.
5. Não criar script, util ou fluxo novo fora deste repositório sem registrá-lo aqui e em `docs/`.

## Estrutura

- `docs/decisoes.md`: decisões de produto aprovadas pelo dono.
- `docs/bootstrap.md`: passo a passo para inicializar o ambiente do zero.
- `docs/mapa-funcoes.md`: mapa de funções, observado publicamente e sem cópia de terceiros.
- `scripts/create-db.js`: cria o banco `evolution_api` no PostgreSQL local.
- `scripts/make-env.js`: gera o `.env` da Evolution API com chave aleatória e sem exibir valores.
- `scripts/rotate-pg-password.js`: troca a senha do usuário do banco e atualiza o arquivo de senha local.
- `.env.example`: variáveis de ambiente, sem valores.

A Evolution API (código oficial, upstream) não é versionada aqui. Ela é clonada para `evolution-api/`, que está no `.gitignore`.

## Regras de segurança

- Nunca versionar tokens, chaves, senhas, sessões, QR codes, dumps de banco ou logs com dados pessoais.
- Dados de grupos e contatos não entram no repositório.
- A Evolution API usa sessão de WhatsApp Web (não oficial). Use número dedicado, se possível, e volume baixo.
- Criar instâncias, rotinas ou envios reais exige aprovação explícita do dono.

## Status

Fase de planejamento. A Evolution API é o caminho único para leitura de grupos e envio de relatórios, em volume baixo no início. A Cloud API da Meta está fora do MVP e saiu deste repositório (permanece no histórico do git).

Ainda não publicado: `docs/evolution-setup.md`. Ele será publicado somente após validar a instalação local.
