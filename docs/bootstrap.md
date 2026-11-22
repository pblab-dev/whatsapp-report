# 🚀 Bootstrap do projeto (novo bot ou novo ambiente)

Este guia serve para inicializar o bot do zero, em uma máquina nova ou em um bot duplicado para outro usuário. O repositório é a fonte de verdade: nada aqui deve conter segredos.

## 📋 1. Pré-requisitos

- Git e GitHub com acesso ao repositório `pblab-dev/whatsapp-report`.
- Docker e Docker Compose (caminho recomendado para a Evolution API).
- Um número de WhatsApp dedicado (recomendado, não obrigatório).
- Conta Meta Business para o caminho da Cloud API (ver `docs/wizard-meta-cloud-api.md`).

## 🧩 2. Ordem de inicialização

1. 📥 Clonar este repositório.
2. 🔐 Criar o `.env` local a partir de `.env.example`. Preencher só com valores próprios. Nunca commitar.
3. 🐳 Subir a Evolution API localmente (passo a passo em `docs/evolution-setup.md`, a ser criado após a instalação ser aprovada e validada).
4. 📱 Conectar o WhatsApp: a conexão por QR code depende do dono da conta.
5. 📝 Rodar o setup do produto: listar grupos ativos, escolher grupos monitorados, destinatários, periodicidade e formato.
6. 🧪 Testar sem enviar para contatos reais. Envio real só com aprovação explícita.

## 🔄 3. Checklist de duplicação de bot

- [ ] Clonar o repositório mais recente.
- [ ] Criar `.env` próprio, sem copiar o de outro usuário.
- [ ] Gerar credenciais e chaves novas para cada instalação.
- [ ] Confirmar que nenhuma sessão, QR ou token veio junto.
- [ ] Registrar na memória do bot as decisões do novo usuário.

## 🛡️ 4. Regras de segurança

- Repositório público: nunca versionar `.env`, chaves, tokens, sessões, QR codes, dumps de banco ou logs com dados pessoais.
- Segredos ficam no `.env` local ou no gerenciador de segredos.
- Dados de grupos e de contatos não entram no repositório.

## ⚠️ 5. Limitações

- Os comandos de instalação da Evolution API ainda serão validados na documentação oficial antes de entrar aqui.
- Esta etapa não foi executada: aguarda aprovação do dono.
