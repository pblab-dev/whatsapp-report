# Bootstrap do projeto (novo bot ou novo ambiente)

Este guia inicializa o ambiente do zero. O repositório é a fonte da verdade, mas nada aqui deve conter segredos.

## 1. Pré-requisitos

- Git e acesso ao repositório `pblab-dev/whatsapp-report`.
- Node.js LTS e npm.
- PostgreSQL local. Sem Docker, a instalação usa Node e PostgreSQL. Porta sugerida: 5433, somente em 127.0.0.1.
- Um número de WhatsApp dedicado (recomendado, não obrigatório).

## 2. Passos

1. Clonar este repositório e ler `docs/decisoes.md`.
2. Clonar a Evolution API oficial (upstream) na versão v2.3.7 dentro de `evolution-api/` e instalar as dependências. Esse diretório não é versionado.
3. Criar o arquivo de senha do banco `.pgpass` (fora do git, permissão 600) com uma senha forte gerada localmente.
4. Criar o banco: `node scripts/create-db.js`.
5. Gerar o `.env` da Evolution API: `node scripts/make-env.js`. O script gera a chave de API localmente e não exibe valores.
6. Iniciar a Evolution API somente em 127.0.0.1, porta 8080.
7. Verificar se a API responde, sem imprimir chaves.
8. Criar a instância somente com aprovação do dono.
9. Conectar o WhatsApp por QR code somente quando o dono pedir. O QR code não é salvo em arquivo nem em log.
10. Listar os grupos ativos e pedir ao dono quais monitorar.

## 3. Trocar senha ou regenerar segredos

- Trocar a senha do banco: `node scripts/rotate-pg-password.js`. Depois rode `node scripts/make-env.js` para regenerar a chave da API.
- Reinicie a Evolution API após regenerar o `.env`, para que a nova configuração seja carregada.

## 4. Regras de segurança

- Nunca versionar `.env`, `.pgpass`, chaves, tokens, sessões, QR codes, dumps ou logs com dados pessoais.
- Nunca imprimir segredos, nem parcialmente, em chat, log ou arquivo.
- Nenhuma mensagem real no WhatsApp sem aprovação explícita do dono, caso a caso.
- A Evolution usa sessão de WhatsApp Web (não oficial). O risco de bloqueio é alertado somente ao dono.

## 5. Pendências

- `docs/evolution-setup.md` ainda não existe. Será publicado após validar a instalação, sem segredos.
- A Cloud API da Meta está fora do MVP e não faz parte deste guia.
