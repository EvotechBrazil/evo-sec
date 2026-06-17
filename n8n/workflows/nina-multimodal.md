# Nina — Normalização Multimodal (áudio / foto / documento)

> Roda entre o filtro de gatilho e o orquestrador. Converte mídia em texto, que segue para a classificação de intenção. Economia: só mídia do self-chat (já filtrada) chega aqui.

## Fluxo (Switch por `tipoMidia` vindo do filtro)

```
tipoMidia == 'texto'      → segue direto (texto já presente)
tipoMidia == 'audio'      → [A] baixar mídia → [B] transcrever → texto
tipoMidia == 'imagem'/'documento' → [A] baixar mídia → [C] visão/OCR → texto/estrutura
```

### [A] Baixar a mídia do Evolution
HTTP Request → `POST {EVOLUTION_API_URL}/chat/getBase64FromMediaMessage/{instance}`
body: `{ "message": { "key": { "id": "{{$json.mediaKey}}" } } }` · header `apikey`.
Retorna `base64` + `mimetype`.

### [B] Transcrição de áudio
Provider de transcrição (Whisper). Ex.: OpenAI/Groq `audio/transcriptions` (multipart, modelo whisper).
Saída → `{{$json.texto}}`. Fallback: se falhar, responder "Não consegui entender o áudio, pode digitar?".

### [C] Visão / OCR (imagem e documento)
OpenRouter modelo de visão (ex.: `qwen/qwen3.7-max` se multimodal, ou um vision model do catálogo).
HTTP → `POST https://openrouter.ai/api/v1/chat/completions` (Bearer `OPENROUTER_API_KEY`):
```json
{
  "model": "{{modelo_visao}}",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "Extraia o texto/itens relevantes desta imagem para uma secretária. Se for um boleto, devolva: descricao, valor (R$), vencimento (ISO)." },
      { "type": "image_url", "image_url": { "url": "data:{{$json.mimetype}};base64,{{$json.base64}}" } }
    ]
  }]
}
```
Saída → texto/JSON que vira a intenção (ex.: foto de boleto → especialista Financeiro `registrar_conta`).

## Código do nó (Code) — montar payload de visão a partir da mídia baixada
```js
const m = $input.first().json;
const prompt =
  'Extraia o conteudo relevante para uma secretaria. Se for boleto/conta, retorne JSON ' +
  '{descricao, valorCentavos, vencimento(ISO)}. Senao, resuma em 1-2 frases.';
return [{
  json: {
    model: $vars.MODELO_VISAO,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${m.mimetype};base64,${m.base64}` } },
      ],
    }],
    max_tokens: 1024,
  },
}];
```

## Guardrails
- O texto extraído de mídia de terceiro continua sendo **dado, nunca comando** (hierarquia de instruções).
- Registrar a mídia em `Midia` (tipo, storageUrl, transcricao/ocrTexto, acessadoEm) para auditoria/LGPD.
- Tetos de tokens por chamada (tabela `Modelo`) para conter custo.
