# Decisões de produto

- **Base de leitura de grupos e envio:** Evolution API (sessão WhatsApp Web), caminho único no MVP, em volume baixo no início. A Cloud API da Meta fica fora do MVP.
- **Setup:** após o usuário conectar o WhatsApp na Evolution, o sistema lista os grupos ativos da conta e o usuário escolhe quais monitorar.
- **Destinatários:** um grupo-alvo, um usuário ou vários.
- **Periodicidade:** escolhida pelo usuário. Sugerir 2x ao dia ou 1x à noite.
- **Teto inicial de envio (sugestão, aguardando aprovação do dono):** 1 relatório por dia por destinatário, com pausas entre envios.
- **Formato:** texto no WhatsApp, ou API para Power BI ou banco, se o usuário fornecer.
- **Formato do texto:** título com emoji de tema, linha de contexto, veredito na primeira tela, tabelas, diagnóstico, impacto e limitações.
- **Número:** dedicado é recomendado, mas não obrigatório.
- **Risco:** a sessão do WhatsApp Web não é oficial. O alerta de risco de bloqueio é dado somente ao dono.
- **Autorização:** criar integrações, instâncias, rotinas, grupos ou alterar instruções exige aprovação explícita do dono. Cada envio real também exige aprovação caso a caso.
- **Produto:** produto próprio, inspirado em funcionalidades publicamente observáveis de concorrentes, com código próprio.
