/* ADA.EXE — voz, comandos locais e conexão com IA */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const ui = {
  mouth: $('#mouth'), speech: $('#speechText'), form: $('#commandForm'), input: $('#commandInput'),
  submit: $('#submitButton'), mic: $('#microphoneButton'), status: $('#assistiveStatus'), face: $('.ai-face'),
  eyes: $$('.eye'), pupils: $$('.pupil'), bars: $$('.audio-bars span'), indicator: $('#aiIndicator'),
  indicatorText: $('#aiIndicatorText'), settingsButton: $('#settingsButton'), dialog: $('#settingsDialog'),
  closeSettings: $('#closeSettingsButton'), settingsForm: $('#settingsForm'), provider: $('#providerSelect'),
  providerDescription: $('#providerDescription'), remoteSettings: $('#remoteSettings'), key: $('#apiKeyInput'),
  model: $('#modelInput'), toggleKey: $('#toggleKeyButton'), clearKey: $('#clearKeyButton'), settingsStatus: $('#settingsStatus')
};

const SETTINGS_STORAGE_KEY = 'ada.exe.ai.settings.v1';
const PROVIDERS = {
  gemini: { label: 'GEMINI', model: 'gemini-2.5-flash', url: 'https://aistudio.google.com/app/apikey', description: 'Use uma chave gratuita criada no Google AI Studio. O modelo padrão utiliza a camada gratuita quando ela estiver disponível para sua conta.' },
  openrouter: { label: 'OPENROUTER FREE', model: 'openrouter/free', url: 'https://openrouter.ai/keys', description: 'Use uma chave gratuita do OpenRouter. O modelo openrouter/free seleciona um modelo sem custo, sujeito aos limites do serviço.' },
  local: { label: 'MODO LOCAL', model: '', description: 'Mantém respostas locais sobre Ada Lovelace e os comandos de voz, sem conexão e sem chave de API.' }
};
const ADA = {
  sleep: true, speaking: false, listening: false, thinking: false, recognition: null, voices: [],
  history: [], queue: [], controller: null, settings: readSettings()
};
let talkingInterval;
let micDenied = false;

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY));
    if (saved && PROVIDERS[saved.provider]) return { provider: saved.provider, apiKey: String(saved.apiKey || ''), model: String(saved.model || '') };
  } catch (_) { /* configuração inválida: inicia em modo local */ }
  return { provider: 'local', apiKey: '', model: '' };
}
function saveSettings(settings) {
  ADA.settings = settings;
  ADA.history = [];
  try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)); }
  catch (_) { setStatus('Não foi possível salvar a configuração neste navegador; ela permanecerá ativa apenas nesta sessão.'); }
  updateIndicator();
}
function setStatus(text) { ui.status.textContent = text; }
function normalize(text) { return String(text).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
function remoteReady() { return ADA.settings.provider !== 'local' && Boolean(ADA.settings.apiKey.trim()); }
function updateIndicator() {
  ui.indicatorText.textContent = ADA.thinking ? 'CONSULTANDO IA...' : remoteReady() ? PROVIDERS[ADA.settings.provider].label : 'MODO LOCAL';
  ui.indicator.classList.toggle('is-active', remoteReady());
  ui.indicator.classList.toggle('is-thinking', ADA.thinking);
}
function setEmotion(mood) {
  const shadows = {
    happy: '0 0 90px rgba(0,255,120,.7), inset 0 0 50px rgba(0,255,120,.15)',
    thinking: '0 0 90px rgba(180,0,255,.7), inset 0 0 50px rgba(180,0,255,.15)',
    alert: '0 0 100px rgba(255,0,80,.8), inset 0 0 60px rgba(255,0,80,.2)',
    sleep: '0 0 25px rgba(100,100,100,.15)',
    neutral: '0 0 60px rgba(0,229,255,.2), inset 0 0 50px rgba(0,229,255,.08)'
  };
  ui.face.style.boxShadow = shadows[mood] || shadows.neutral;
}
function closeEyes() { ui.eyes.forEach((eye) => { eye.style.transform = 'scaleY(.08)'; eye.style.opacity = '.5'; }); }
function openEyes() { ui.eyes.forEach((eye) => { eye.style.transform = 'scaleY(1)'; eye.style.opacity = '1'; }); }
function stopTalking() {
  clearInterval(talkingInterval);
  ui.mouth.style.height = '18px'; ui.mouth.style.width = '120px';
  ui.bars.forEach((bar) => { bar.style.height = '20px'; });
}
function startTalking() {
  stopTalking();
  talkingInterval = setInterval(() => {
    if (!ADA.speaking) return stopTalking();
    ui.mouth.style.height = `${Math.random() * 55 + 20}px`;
    ui.mouth.style.width = `${Math.random() * 25 + 105}px`;
    ui.bars.forEach((bar) => { bar.style.height = `${Math.random() * 45 + 10}px`; });
  }, 65);
}
function finishSpeech() {
  stopTalking(); ADA.speaking = false;
  setStatus(ADA.listening ? 'Microfone ativo. Você pode falar ou escrever uma pergunta.' : 'Você pode escrever uma pergunta para a ADA.');
  if (ADA.recognition && ADA.listening && !micDenied) {
    setTimeout(() => { try { ADA.recognition.start(); } catch (_) { /* a escuta já foi retomada */ } }, 500);
  }
  const next = ADA.queue.shift();
  if (next) setTimeout(() => speak(next), 150);
}
function speak(text) {
  const answer = String(text || '').trim();
  if (!answer) return;
  ui.speech.textContent = answer;
  if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
    setStatus('Resposta disponível em texto. A síntese de voz não é suportada neste navegador.'); return;
  }
  if (ADA.speaking) { ADA.queue.push(answer); return; }
  ADA.speaking = true;
  if (ADA.recognition && ADA.listening) try { ADA.recognition.stop(); } catch (_) { /* já parado */ }
  const utterance = new SpeechSynthesisUtterance(answer);
  utterance.lang = 'pt-BR'; utterance.rate = 1;
  const portugueseVoices = ADA.voices.filter((voice) => voice.lang.toLowerCase().startsWith('pt'));
  const voice = portugueseVoices.find((item) => /natural/i.test(item.name))
    || portugueseVoices.find((item) => /google.*portugu/i.test(item.name))
    || portugueseVoices.find((item) => item.lang.toLowerCase().startsWith('pt-br'))
    || portugueseVoices[0];
  if (voice) utterance.voice = voice;
  utterance.onstart = () => { startTalking(); setStatus('ADA está respondendo.'); };
  utterance.onend = finishSpeech;
  utterance.onerror = finishSpeech;
  speechSynthesis.cancel();
  setTimeout(() => speechSynthesis.speak(utterance), 40);
}
function findLocalAnswer(question) {
  if (typeof knowledgeBase !== 'undefined' && Array.isArray(knowledgeBase)) {
    const item = knowledgeBase.find((entry) => entry.keywords.some((keyword) => question.includes(normalize(keyword))));
    if (item) return item.answer;
  }
  return 'Ainda não tenho uma resposta local para isso. Abra CONFIGURAR IA e adicione uma chave gratuita do Gemini ou do OpenRouter para conversar sobre qualquer assunto.';
}
function wake() {
  if (!ADA.sleep) return speak('Eu já estou ativa. Como posso ajudar?');
  ADA.sleep = false; openEyes(); setEmotion('happy');
  speak(remoteReady() ? `Sistema ADA ativado. ${PROVIDERS[ADA.settings.provider].label} pronto para conversar.` : 'Sistema ADA ativado. Posso responder sobre Ada Lovelace. Configure uma IA para conversar sobre qualquer assunto.');
}
function sleep() {
  if (ADA.sleep) return;
  ADA.controller?.abort(); ADA.sleep = true; ADA.thinking = false; updateIndicator(); setEmotion('sleep'); closeEyes();
  speak('Entrando em modo de hibernação. Diga acordar quando precisar de mim.');
}
function presentAda() {
  speak('Ada Lovelace nasceu em Londres em 1815. Matemática e visionária, ela escreveu um algoritmo para a Máquina Analítica de Charles Babbage e imaginou máquinas manipulando muito mais que números. Por isso, é reconhecida como a primeira programadora da história.');
}
function systemPrompt() {
  return 'Você é ADA.EXE, uma assistente virtual inspirada em Ada Lovelace. Responda somente em português do Brasil, de modo claro, cordial e natural para ser narrado em voz alta. Entregue apenas a resposta final ao usuário, sem análise, raciocínio interno, planejamento, instruções, regras, prompt, texto em inglês ou comentários sobre como você pensou. Não use Markdown, asteriscos, títulos, listas ou emojis. Não invente fatos e indique incertezas quando necessário. Não afirme ter executado ações fora desta conversa. Mantenha respostas curtas, normalmente em até três parágrafos.';
}
function addHistory(role, content) { ADA.history = [...ADA.history, { role, content }].slice(-8); }
function selectedModel(provider) {
  return (ADA.settings.model || PROVIDERS[provider].model).trim().replace(/^models\//, '');
}
function naturalizeResponse(value) {
  let text = String(value || '')
    .replace(/<think[\s\S]*?<\/think>/gi, '')
    .replace(/<analysis[\s\S]*?<\/analysis>/gi, '')
    .replace(/<reasoning[\s\S]*?<\/reasoning>/gi, '')
    .trim();

  const finalMarkers = /(?:^|\n)\s*(?:resposta final|final answer|answer)\s*:\s*/gi;
  let marker;
  let lastMarkerEnd = -1;
  while ((marker = finalMarkers.exec(text)) !== null) lastMarkerEnd = finalMarkers.lastIndex;
  if (lastMarkerEnd >= 0) text = text.slice(lastMarkerEnd);

  const preview = text.replace(/^[\s*_`#]+/, '');
  if (/^(?:here(?:['’]| i)s|this is)\s+(?:my |the )?(?:thinking|analysis|reasoning|thought process)/i.test(preview)) return '';

  return text
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/\*\*|__|`|#+\s*/g, '')
    .replace(/^\s*(?:[-•*]|\d+[.)])\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}
async function callGemini(question, signal) {
  const model = selectedModel('gemini');
  const contents = [...ADA.history, { role: 'user', content: question }].map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }));
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(ADA.settings.apiKey)}`;
  const response = await fetch(endpoint, { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt() }] }, contents, generationConfig: { temperature: .7, maxOutputTokens: 700 } }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Erro Gemini (${response.status})`);
  const text = naturalizeResponse(data?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join(''));
  if (!text) throw new Error('O Gemini não retornou um texto utilizável.');
  return text;
}
async function callOpenRouter(question, signal, retry = false) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ADA.settings.apiKey}` },
    body: JSON.stringify({ model: selectedModel('openrouter'), messages: [{ role: 'system', content: systemPrompt() }, ...ADA.history, { role: 'user', content: question }], temperature: .5, max_tokens: 500, reasoning: { exclude: true }, include_reasoning: false })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Erro OpenRouter (${response.status})`);
  const content = data?.choices?.[0]?.message?.content;
  const rawText = typeof content === 'string' ? content : Array.isArray(content) ? content.map((part) => part.text || '').join('') : '';
  const text = naturalizeResponse(rawText);
  if (!text && !retry) return callOpenRouter(`${question}\n\nResponda agora apenas com a resposta final em português, sem mostrar raciocínio ou análise.`, signal, true);
  if (!text) throw new Error('O modelo gratuito retornou um raciocínio interno em vez de uma resposta. Tente novamente.');
  return text;
}
async function askAI(question) {
  ADA.controller?.abort(); ADA.controller = new AbortController(); ADA.thinking = true; updateIndicator(); setEmotion('thinking');
  setStatus(`Consultando ${PROVIDERS[ADA.settings.provider].label}...`); ui.submit.disabled = true;
  try {
    const answer = ADA.settings.provider === 'gemini' ? await callGemini(question, ADA.controller.signal) : await callOpenRouter(question, ADA.controller.signal);
    addHistory('user', question); addHistory('assistant', answer); return answer.slice(0, 1600);
  } finally { ADA.controller = null; ADA.thinking = false; ui.submit.disabled = false; updateIndicator(); }
}
async function processQuestion(value) {
  const question = String(value || '').trim(); const command = normalize(question);
  if (!question || ADA.thinking) return;
  if (/\b(dormir|hibernar|desligar)\b/.test(command)) return sleep();
  if (/\b(acordar|despertar|ligar)\b/.test(command)) return wake();
  if (ADA.sleep) { ui.speech.textContent = 'ADA está em modo de hibernação. Diga ou escreva “acordar” para ativá-la.'; return setStatus('ADA está em hibernação. Use o comando acordar para continuar.'); }
  if (command.includes('conte a historia da ada') || command.includes('apresentacao completa')) return presentAda();
  if (!remoteReady()) { setEmotion('thinking'); return speak(findLocalAnswer(command)); }
  try { const answer = await askAI(question); setEmotion('happy'); speak(answer); }
  catch (error) {
    if (error.name === 'AbortError') return;
    console.error('Falha no provedor de IA:', error); setEmotion('alert');
    const fallback = findLocalAnswer(command);
    if (!fallback.startsWith('Ainda não')) { setStatus(`A IA não respondeu (${error.message}). Usei a base local.`); return speak(fallback); }
    speak(`Não consegui consultar a IA agora. Verifique a chave, o modelo e sua conexão. Detalhe: ${error.message}`);
  }
}
function setMic(active, supported = true) {
  ui.mic.disabled = !supported; ui.mic.setAttribute('aria-pressed', String(active));
  ui.mic.textContent = !supported ? 'MICROFONE INDISPONÍVEL' : active ? 'DESATIVAR MICROFONE' : 'ATIVAR MICROFONE';
}
function setupRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return setMic(false, false);
  ADA.recognition = new Recognition(); ADA.recognition.lang = 'pt-BR'; ADA.recognition.continuous = true; ADA.recognition.interimResults = false;
  ADA.recognition.onstart = () => { micDenied = false; ADA.listening = true; setMic(true); setStatus('Microfone ativo. Você pode falar ou escrever uma pergunta.'); };
  ADA.recognition.onresult = (event) => { if (!ADA.speaking && !ADA.thinking) { const result = event.results[event.results.length - 1]; if (result?.isFinal) processQuestion(result[0].transcript); } };
  ADA.recognition.onerror = (event) => {
    if (['not-allowed', 'service-not-allowed'].includes(event.error)) { micDenied = true; ADA.listening = false; setMic(false); setStatus('O acesso ao microfone foi bloqueado. Você ainda pode escrever sua pergunta.'); }
    else if (event.error !== 'aborted') setStatus('Não foi possível entender o áudio. Tente novamente ou escreva sua pergunta.');
  };
  ADA.recognition.onend = () => { if (ADA.listening && !ADA.speaking && !micDenied) setTimeout(() => { try { ADA.recognition.start(); } catch (_) { /* já iniciada */ } }, 500); };
}
function toggleMic() {
  if (!ADA.recognition) return setStatus('O reconhecimento de voz não é suportado neste navegador. Use o campo de texto.');
  if (ADA.listening) { ADA.listening = false; try { ADA.recognition.stop(); } catch (_) { /* já parada */ } setMic(false); return setStatus('Microfone desativado. Você pode continuar pelo campo de texto.'); }
  micDenied = false; try { ADA.recognition.start(); } catch (_) { setStatus('Não foi possível ativar o microfone. Tente novamente.'); }
}
function renderProvider() {
  const provider = PROVIDERS[ui.provider.value]; const remote = ui.provider.value !== 'local';
  ui.remoteSettings.hidden = !remote;
  ui.providerDescription.replaceChildren(document.createTextNode(provider.description));
  if (remote) { const link = document.createElement('a'); link.href = provider.url; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = ' Criar chave gratuita ↗'; ui.providerDescription.append(link); }
  if (ui.model.dataset.provider !== ui.provider.value) ui.model.value = ADA.settings.provider === ui.provider.value && ADA.settings.model ? ADA.settings.model : provider.model;
  ui.model.dataset.provider = ui.provider.value;
}
function openSettings() {
  ui.provider.value = ADA.settings.provider; ui.key.value = ADA.settings.apiKey; ui.model.value = ADA.settings.model; ui.settingsStatus.textContent = '';
  delete ui.model.dataset.provider; renderProvider(); ui.dialog.hidden = false; document.body.classList.add('modal-open');
  setTimeout(() => (ui.provider.value === 'local' ? ui.provider : ui.key).focus(), 0);
}
function closeSettings() { ui.dialog.hidden = true; document.body.classList.remove('modal-open'); ui.settingsButton.focus(); }
function setupSettings() {
  ui.settingsButton.addEventListener('click', openSettings); ui.closeSettings.addEventListener('click', closeSettings);
  ui.dialog.addEventListener('click', (event) => { if (event.target === ui.dialog) closeSettings(); }); ui.provider.addEventListener('change', renderProvider);
  ui.toggleKey.addEventListener('click', () => { const hidden = ui.key.type === 'password'; ui.key.type = hidden ? 'text' : 'password'; ui.toggleKey.textContent = hidden ? 'OCULTAR' : 'MOSTRAR'; });
  ui.clearKey.addEventListener('click', () => { ui.key.value = ''; ui.settingsStatus.textContent = 'Chave removida. Clique em “Salvar e ativar” para confirmar.'; });
  ui.settingsForm.addEventListener('submit', (event) => {
    event.preventDefault(); const provider = ui.provider.value; const apiKey = ui.key.value.trim();
    if (provider !== 'local' && !apiKey) { ui.settingsStatus.textContent = 'Cole uma chave de API para ativar este provedor.'; return ui.key.focus(); }
    saveSettings({ provider, apiKey, model: provider === 'local' ? '' : ui.model.value.trim() || PROVIDERS[provider].model });
    setStatus(`Configuração salva: ${provider === 'local' ? 'modo local' : PROVIDERS[provider].label} ativo.`); closeSettings();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !ui.dialog.hidden) closeSettings(); });
}
function createParticle() {
  if (document.hidden || $$('.particle').length > 28) return;
  const particle = document.createElement('div'); particle.className = 'particle'; const size = Math.random() * 4 + 2;
  Object.assign(particle.style, { width: `${size}px`, height: `${size}px`, left: `${Math.random() * innerWidth}px`, top: `${innerHeight}px` }); document.body.append(particle);
  particle.animate([{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1 }, { transform: 'translateY(-120vh)', opacity: 0 }], { duration: Math.random() * 5000 + 4000 }); setTimeout(() => particle.remove(), 9000);
}
function initialize() {
  closeEyes(); setEmotion('sleep'); updateIndicator();
  if ('speechSynthesis' in window) { ADA.voices = speechSynthesis.getVoices(); speechSynthesis.addEventListener('voiceschanged', () => { ADA.voices = speechSynthesis.getVoices(); }); }
  setupRecognition(); setupSettings();
  ui.form.addEventListener('submit', async (event) => { event.preventDefault(); const value = ui.input.value.trim(); if (!value) { setStatus('Escreva uma pergunta ou use o microfone.'); return ui.input.focus(); } ui.input.value = ''; await processQuestion(value); ui.input.focus(); });
  ui.mic.addEventListener('click', toggleMic);
  document.addEventListener('mousemove', (event) => { if (!ADA.sleep) { const x = (event.clientX / innerWidth - .5) * 18; const y = (event.clientY / innerHeight - .5) * 18; ui.pupils.forEach((pupil) => { pupil.style.transform = `translate(${x}px, ${y}px)`; }); } });
  setInterval(() => { if (!ADA.sleep && !document.hidden) ui.eyes.forEach((eye) => eye.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }, { transform: 'scaleY(1)' }], { duration: 200 })); }, 5000);
  setInterval(createParticle, 240); setStatus('ADA está em hibernação. Diga ou escreva “acordar” para ativá-la.');
}
initialize();
