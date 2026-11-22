# Mapa de funções

Baseado apenas em funções observáveis publicamente. Código e interface são próprios.

| Área | Função | Proposta | Situação |
|---|---|---|---|
| Painel de métricas | Engajamento, volume de mensagens, membros ativos vs. inativos, horários de pico, comparação entre grupos | MVP | Implementado (`src/metrics.js`), com testes |
| Churn e retenção | Taxa de saída, membros em risco, tempo médio de permanência, saídas em massa | MVP | Implementado (`src/metrics.js`), com testes |
| Coleta de grupos | Leitura de grupos e mensagens pela Evolution (somente metadados) | MVP (infraestrutura) | Implementado (`src/collect.js`, `src/evolution.js`) |
| Relatórios em texto | Texto no WhatsApp no formato padrão do projeto | MVP | Implementado (`src/report.js`) |
| Agendamento | 2x ao dia ou 1x à noite, janela de envio, teto diário | MVP | Implementado (`src/schedule.js`); teto a confirmar (ver `decisoes.md`) |
| Envio de relatórios | Envio pela Evolution com aprovação caso a caso | MVP | Implementado com travas (`src/sender.js`); envio real só com aprovação |
| Resumos inteligentes | Resumo diário, itens acionáveis, mudança de sentimento | Fase 2 | Não iniciado |
| Alertas | Queda de engajamento, saída em massa, palavras-chave críticas | Fase 2 | Saída em massa já aparece no relatório; alertas push não iniciados |
| Disparos programados | Envio único ou recorrente, texto e mídia | Fora do escopo inicial (exige aprovação específica) | Não iniciado |
| Perguntas em linguagem natural | Consulta aos dados por chat | Fase 3 | Não iniciado |
| Planos | Cobrança por bloco de membros | Pendente | Pendente |

## Confirmação do MVP

Confirmado pelo dono em 2026-11-22 (America/Fortaleza): o MVP são as áreas marcadas como MVP acima (painel de métricas e churn/retenção, com coleta, relatórios, agendamento e envio com aprovação).

## Pendências antes de comercializar

- Verificar a página de preços e os termos de uso do WhatsApp e da Evolution API.
- Revisar termos de uso e política de privacidade do produto.
- Revogar o token GitHub do projeto, somente quando o bot estiver pronto para distribuição (decisão do dono).
