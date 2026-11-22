# Whatsapp Report - Assistente Inteligente

SaaS de relatórios de grupos de WhatsApp. Coleta dados de grupos escolhidos pelo usuário, gera relatórios e envia a destinatários.

## 📂 Estrutura

- `docs/decisoes.md`: decisões de produto já aprovadas pelo dono
- `docs/mapa-funcoes.md`: mapa de funções (observado publicamente, sem copiar textos, marca ou layout de terceiros)
- `docs/wizard-meta-cloud-api.md`: passo a passo de configuração para o usuário
- `docs/evolution-setup.md`: instalação local da Evolution API (a fazer)
- `.env.example`: variáveis de ambiente necessárias, sem valores

## ⚠️ Regras de segurança

- Nunca commitar tokens, chaves, QR codes ou dados de sessão.
- Arquivos `.env` estão no `.gitignore`.
- A Evolution API usa sessão de WhatsApp Web (não oficial). Use número dedicado.

## 🚧 Status

Fase de planejamento. Nada foi instalado, conectado ou enviado.
