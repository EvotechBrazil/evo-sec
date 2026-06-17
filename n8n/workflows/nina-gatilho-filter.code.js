/**
 * NÓ "Code" do n8n — FILTRO DE GATILHO (primeiro nó após o Webhook do Evolution).
 * É a defesa contra o risco crítico (P×I=20): a Nina NUNCA pode reagir a conversa
 * de terceiro. Só prossegue quando: self-chat (Rodrigo → ele mesmo) + sessão ativa.
 *
 * Retornar [] (vazio) encerra o fluxo silenciosamente — sem LLM, sem gravação.
 * Estado de sessão guardado no static data do workflow (sem custo de API por msg).
 *
 * Config esperada em variáveis do n8n / nó Set anterior:
 *   $vars.TENANT_ID            — uuid do tenant (mapeado da instância Evolution)
 *   $vars.OWN_NUMBER           — número próprio (ex: 5543999864409)
 *   $vars.GATILHO_CODIGO       — palavra que abre a sessão (ex: "nina")
 *   $vars.SESSAO_MINUTOS       — duração da sessão (ex: 30)
 */
const item = $input.first().json;

// ---- Extrai campos do payload do Evolution (messages.upsert) ----
const data = item.body?.data ?? item.data ?? item;
const key = data.key ?? {};
const fromMe = key.fromMe === true;
const remoteJid = (key.remoteJid ?? '').split('@')[0];
const msg = data.message ?? {};
const texto =
  msg.conversation ??
  msg.extendedTextMessage?.text ??
  msg.imageMessage?.caption ??
  msg.documentMessage?.caption ??
  '';

const ownNumber = String($vars.OWN_NUMBER ?? '');
const codigo = String($vars.GATILHO_CODIGO ?? 'nina').toLowerCase();
const sessaoMin = Number($vars.SESSAO_MINUTOS ?? 30);

// ---- Regra 1: só self-chat (Rodrigo para ele mesmo) ----
if (!fromMe || remoteJid !== ownNumber) {
  return []; // conversa de terceiro → ignora totalmente
}

// ---- Regra 2: sessão (abre com o código; expira após N min) ----
const store = $getWorkflowStaticData('global');
const agora = Date.now();
const textoLower = texto.trim().toLowerCase();
const ativaAte = Number(store.sessaoAtivaAte ?? 0);

const abre = textoLower === codigo || textoLower.startsWith(codigo + ' ');
const fecha = textoLower === 'fim' || textoLower === 'tchau nina';

if (fecha) {
  store.sessaoAtivaAte = 0;
  return [{ json: { _encerrar: true, mensagem: 'Sessão encerrada. Até logo!' } }];
}

if (abre) {
  store.sessaoAtivaAte = agora + sessaoMin * 60_000;
  // remove o código do texto para não poluir a intenção
  const semCodigo = texto.trim().slice(codigo.length).trim();
  if (!semCodigo) {
    return [{ json: { _abertura: true, mensagem: 'Oi! Sessão aberta. Pode mandar.' } }];
  }
  return [normaliza(data, semCodigo, $vars.TENANT_ID)];
}

if (agora <= ativaAte) {
  // sessão ativa → renova janela e segue
  store.sessaoAtivaAte = agora + sessaoMin * 60_000;
  return [normaliza(data, texto, $vars.TENANT_ID)];
}

// fora de sessão e sem código → ignora (nem responde, pra não virar chatbot do próprio Rodrigo)
return [];

/** Normaliza a mensagem para o orquestrador, detectando o tipo de mídia. */
function normaliza(data, texto, tenantId) {
  const msg = data.message ?? {};
  let tipoMidia = 'texto';
  if (msg.audioMessage) tipoMidia = 'audio';
  else if (msg.imageMessage) tipoMidia = 'imagem';
  else if (msg.documentMessage) tipoMidia = 'documento';
  return {
    json: {
      tenantId,
      tipoMidia,
      texto,
      mediaKey: data.key?.id ?? null,
      remetente: 'tiago',
      recebidoEm: new Date().toISOString(),
    },
  };
}
