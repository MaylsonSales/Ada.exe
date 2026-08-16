# ADA.EXE

Interface web da ADA Lovelace com comandos locais, reconhecimento de voz, síntese de fala e suporte opcional a IA generativa.

➡️ Consulte também o [guia rápido de uso](GUIA-RAPIDO.md).

## Usar uma IA gratuita

1. Abra `frontend/index.html` em um navegador moderno.
2. Clique em **CONFIGURAR IA**.
3. Escolha uma opção e cole sua chave:
   - **Google Gemini:** crie uma chave sem custo no [Google AI Studio](https://aistudio.google.com/app/apikey). O modelo padrão é `gemini-2.5-flash`.
   - **OpenRouter:** crie uma chave no [OpenRouter](https://openrouter.ai/keys). O modelo padrão `openrouter/free` seleciona modelos gratuitos automaticamente.
4. Clique em **SALVAR E ATIVAR**, escreva **acordar** e faça sua pergunta.

As chaves são armazenadas apenas no `localStorage` do navegador utilizado. Elas não são incluídas no código nem enviadas para outro servidor além do provedor escolhido. Para publicar o projeto para outras pessoas, use um backend/proxy próprio para proteger a chave; não publique chaves no frontend.

Sem chave, a ADA continua funcionando em modo local com sua base de conhecimento e os recursos de voz disponíveis no navegador.
