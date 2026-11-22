# Decisões de produto

- **Base de leitura de grupos e envio:** Evolution API (sessão WhatsApp Web), caminho único no MVP, em volume baixo no início. A Cloud API da Meta fica fora do MVP.
- **MVP (confirmado pelo dono em 2026-11-22):** painel de métricas e churn/retenção, com coleta, relatórios, agendamento e envio com aprovação. Detalhes em `docs/mapa-funcoes.md`.
- **Setup do usuário (depois de conectar o WhatsApp), conduzido pelo bot:**
  1. Conectar o WhatsApp (QR pedido ao dono, conforme as regras).
  2. Listar os grupos ativos da conta (`node src/cli.js groups`).
  3. Perguntar quais grupos monitorar (`select-groups`).
  4. Perguntar os destinatários: um grupo-alvo, um usuário ou vários (`add-recipient`).
  5. Perguntar a periodicidade: 2x ao dia ou 1x à noite (sugestão: 1x à noite). Ver o teto abaixo.
  6. Confirmar o resumo com o usuário e só então registrar a aprovação (`approve-recipient`).
- **Destinatários:** um grupo-alvo, um usuário ou vários.
- **Periodicidade:** escolhida pelo usuário. Sugerir 2x ao dia ou 1x à noite.
- **Teto inicial de envio (padrão implementado, aguardando confirmação do dono):** 1 relatório por dia por destinatário, com pausa mínima entre envios (padrão 90 s, mínimo 60 s). Constante `maxReportsPerRecipientPerDay` em `src/config.js`.
  - **Conflito a resolver:** "2x ao dia" não cabe no teto de 1 relatório por dia. Se o dono aprovar 2x ao dia, o teto sobe para 2. Até lá, o bot oferece "1x à noite" como padrão.
- **Formato:** texto no WhatsApp, ou API para Power BI ou banco, se o usuário fornecer. A API para Power BI ou banco ainda não foi implementada.
- **Formato do texto:** título com emoji de tema, linha de contexto (📍), veredito na primeira tela, seções por origem, 🎯 diagnóstico, 🔗 impacto e ⚠️ limitações. Sem tabela em markdown, porque o WhatsApp não a renderiza.
- **Número do usuário:** recomendar número de WhatsApp normal (não Business), que reduz bastante o risco de bloqueio. Decisão do dono em 2026-11-22.
- **Privacidade dos dados:** o armazenamento local guarda só metadados (id, horário, tipo, remetente pseudonimizado). Não guarda texto de mensagens. Remetentes e participantes entram como HMAC com salt local (`data/.salt`, fora do git).
- **Risco:** a sessão do WhatsApp Web não é oficial. O alerta de risco de bloqueio é dado somente ao dono.
- **Autorização:** criar integrações, instâncias, rotinas, grupos ou alterar instruções exige aprovação explícita do dono. Cada envio real também exige aprovação caso a caso. Travas técnicas: `WR_ALLOW_REAL_SEND=1` e `--real`, além de `approved` do destinatário.
- **Produto:** produto próprio, inspirado em funcionalidades publicamente observáveis de concorrentes, com código próprio.
