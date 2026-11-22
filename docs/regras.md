# Regras de trabalho do projeto

Regras aprovadas pelo dono. Todo bot que trabalhar neste projeto deve segui-las.

1. **Repositório como fonte da verdade.** `github.com/pblab-dev/whatsapp-report` deve permitir inicializar um bot do zero. Scripts, configs e documentação ficam aqui. Nada de segredos, tokens, sessões ou QR codes no git.
2. **Autorização antes de agir.** Criar ou alterar instâncias, rotinas, bots, grupos, integrações ou instruções exige aprovação explícita do dono. Nenhuma mensagem real no WhatsApp (nem testes para contatos reais) sem aprovação explícita, caso a caso.
3. **Segredos nunca aparecem.** Nunca imprimir chaves, senhas ou dados de sessão, nem parcialmente, em chat, log ou arquivo. Use arquivos com permissão 600 e leitura em memória.
4. **QR code só quando o dono pedir.** Conexão por QR code depende do dono. Nunca salvar QR em arquivo ou log.
5. **Controle de processos desde o início.** Antes de subir qualquer serviço: (a) checar se a porta está livre e de quem é; (b) gravar o PID em arquivo; (c) ter comando de parada controlada (SIGTERM, depois SIGKILL após 30 s) e de status; (d) validar que escuta só em `127.0.0.1`. Nunca deixar processo órfão sem registro. Processo sem controle deve ser reportado ao dono antes de qualquer ação.
6. **Novo script ou fluxo.** Não criar script, util ou fluxo fora deste repositório sem registrá-lo aqui e em `docs/`.
7. **Alerta de risco.** A Evolution usa sessão de WhatsApp Web, não oficial. O alerta de risco de bloqueio é dado ao dono, não ao usuário final.
8. **Idioma.** Responder em português do Brasil, salvo quando o contexto técnico exigir termos em inglês.
9. **Cópia de terceiros.** Ao se inspirar em concorrentes, usar só o que é observável publicamente e desenvolver código próprio. Não copiar textos, marcas, layouts ou código.
10. **Verificar antes de reportar.** Todo resultado deve ser conferido com o próprio sistema (status, código HTTP, arquivo) antes de ser declarado pronto.
