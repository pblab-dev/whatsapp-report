# Bootstrap do projeto (novo bot ou novo ambiente)

Este guia inicializa o bot do zero. O repositório é a fonte da verdade: nada aqui deve conter segredos.

## 1. Pré-requisitos

- Git e acesso ao repositório `pblab-dev/whatsapp-report`.
- Node.js LTS e npm.
- PostgreSQL local. A sandbox atual não tem Docker, então a instalação usa Node e PostgreSQL. Porta sugerida: 5433, apenas em 127.0.0.1.
- Um número de WhatsApp dedicado (recomendado, não obrigatório).

## 2. Passos

1. Clonar o repositório e ler `docs/decisoes.md`.
2. Copiar `.env.example` para `.env` e preencher localmente. Gerar segredos novos para cada ambiente; nunca reutilizar entre bots.
3. Instalar a Evolution API v2.x a partir do código oficial (upstream). Colocar o código em um diretório ignorado pelo git (`evolution-api/`). Não copiar o código para este repositório.
4. Subir o PostgreSQL local, criar um banco e um usuário próprios, com senha forte gerada localmente. A senha vai só para o `.env` local.
5. Iniciar a Evolution API somente em 127.0.0.1, porta 8080.
6. Verificar se a API responde (endpoint de status), sem imprimir chaves.
7. Criar a instância somente com aprovação do dono.
8. Conectar o WhatsApp por QR code somente quando o dono pedir. O QR code não é salvo em arquivo nem em log.
9. Após conectar, listar os grupos ativos e pedir ao dono quais monitorar.

## 3. Regras de segurança

- Nunca versionar `.env`, chaves, tokens, sessões, QR codes, dumps de banco ou logs com dados pessoais.
- Nunca imprimir segredos, nem parcialmente, em chat, log ou arquivo.
- Nenhuma mensagem real no WhatsApp sem aprovação explícita caso a caso.
- Alertar sobre risco de bloqueio somente ao dono (sessão WhatsApp Web não oficial).

## 4. Scripts e utils

Os scripts de criação do banco e de geração do `.env` local estão em revisão. Serão publicados em `scripts/` após a troca de senha local e a validação da instalação. Até lá, não usar cópias soltas de outras pastas.

## 5. Limitações e pendências

- Pendência de segurança: a senha local do banco apareceu parcialmente em log de uma sessão anterior. Deve ser trocada e os segredos regerados antes de publicar o guia validado.
- `docs/evolution-setup.md` ainda não existe. Será publicado após validação.
- Cloud API da Meta fica fora do MVP.
