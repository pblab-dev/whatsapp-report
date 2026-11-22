# Whatsapp Report - Assistente Inteligente

SaaS de relatórios de grupos de WhatsApp. Coleta dados de grupos escolhidos pelo usuário, gera relatórios e envia a destinatários pela Evolution API instalada localmente.

## Regra de consumo (novos bots)

Este repositório é a fonte única de scripts, utils e documentação do projeto. Todo bot novo, ou todo novo ambiente, deve:

1. Clonar `github.com/pblab-dev/whatsapp-report` (ou atualizar com `git pull`) antes de qualquer instalação.
2. Ler `docs/decisoes.md` (decisões aprovadas pelo dono) e `docs/bootstrap.md` (passo a passo).
3. Copiar `.env.example` para `.env` e preencher localmente. O `.env` nunca vai para o git.
4. Usar os scripts da pasta `scripts/` quando existirem (ainda não publicados; ver status).
5. Não criar script, util ou fluxo novo fora deste repositório sem registrá-lo aqui.

## Estrutura

- `docs/decisoes.md`: decisões de produto aprovadas pelo dono.
- `docs/bootstrap.md`: passo a passo para inicializar o projeto.
- `docs/mapa-funcoes.md`: mapa de funções (observado publicamente, sem copiar textos, marcas ou layouts de terceiros).
- `docs/wizard-meta-cloud-api.md`: referência fora do MVP (Cloud API da Meta).
- `.env.example`: variáveis de ambiente, sem valores.
- `.gitignore`: bloqueia segredos, sessões, dumps e logs.

Planejado, ainda não publicado: `docs/evolution-setup.md` e `scripts/` (criação do banco e geração do `.env` local). Serão publicados somente após validação da instalação.

## Regras de segurança

- Nunca versionar tokens, chaves, senhas, sessões, QR codes, dumps de banco ou logs com dados pessoais.
- Dados de grupos e contatos não entram no repositório.
- A Evolution API usa sessão de WhatsApp Web (não oficial). Use número dedicado, se possível, e volume baixo.
- Criar instâncias, rotinas ou envios reais exige aprovação explícita do dono.

## Status

Fase de planejamento. Evolution API é o caminho único, para leitura de grupos e envio de relatórios, em volume baixo no início. A Cloud API da Meta está fora do MVP.
