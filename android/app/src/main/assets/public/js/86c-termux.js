/* =========================================================================
   Mini SK — 86c-termux.js
   📱 Termux — liga o Mini SK ao Termux do seu celular (terminal Linux de
   verdade). Funciona no PWA e no APK do Mini SK. Não precisa de lacre.

   Por que o da Replit "parecia conectar mas não funcionava":
   1. o ttyd (o programa do Termux que abre a porta) só entende o "idioma" dele:
      pede o protocolo "tty", uma mensagem de entrada e um sinal na frente de cada
      tecla ("0" = digitou, "1" = mudou o tamanho). O de lá mandava texto puro;
   2. o endereço certo termina em /ws (ws://127.0.0.1:7681/ws);
   3. o ttyd novo abre só para OLHAR — precisa ligar com -W para aceitar digitação;
   4. no APK, o Android bloqueava ws:// — o 📦 APK do Mini SK agora libera só
      para o próprio celular (127.0.0.1 / localhost).
   ========================================================================= */
(function (SK) {
  'use strict';
  const XTERM = 'https://cdn.jsdelivr.net/npm/@xterm/xterm@5.5.0';
  const FIT = 'https://cdn.jsdelivr.net/npm/@xterm/addon-fit@0.10.0/lib/addon-fit.js';
  const PADRAO = 'ws://127.0.0.1:7681/ws';
  const CMD_INSTALAR = 'pkg install -y ttyd';
  const CMD_LIGAR = 'ttyd -W -i 127.0.0.1 -p 7681 bash';
  const enc = new TextEncoder(), dec = new TextDecoder();
  let box = null, ws = null, term = null, fit = null, simples = false, abriu = false, saindo = false;

  const $ = (s) => SK.$(s, box);
  function status(t, tipo) { const el = $('#tx-status'); if (!el) return; el.textContent = t; el.className = 'tx-status ' + (tipo || ''); }
  function carregarScript(src) { return new Promise((ok, erro) => { if (document.querySelector('script[src="' + src + '"]')) { const t = setInterval(() => { if (window.Terminal) { clearInterval(t); ok(); } }, 100); setTimeout(() => { clearInterval(t); window.Terminal ? ok() : erro(new Error('sem internet')); }, 8000); return; } const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => erro(new Error('sem internet')); document.head.appendChild(s); }); }
  function carregarCss(href) { if (document.querySelector('link[href="' + href + '"]')) return; const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; document.head.appendChild(l); }

  // ── tela: xterm (bonito) ou modo simples (sem internet para baixar o xterm) ──
  async function prepararTela() {
    if (term || simples) return;
    try {
      carregarCss(XTERM + '/css/xterm.css');
      if (!window.Terminal) await carregarScript(XTERM + '/lib/xterm.js');
      if (!window.FitAddon) await carregarScript(FIT);
      term = new window.Terminal({ fontSize: 13, cursorBlink: true, convertEol: false, theme: { background: '#07110d', foreground: '#d7f5e3' } });
      fit = new window.FitAddon.FitAddon(); term.loadAddon(fit);
      term.open($('#tx-term'));
      try { fit.fit(); } catch {}
      term.onData((d) => enviar(d));
      window.addEventListener('resize', () => { try { fit.fit(); tamanho(); } catch {} });
    } catch (e) {
      simples = true;
      $('#tx-term').innerHTML = '<pre id="tx-pre" class="tx-pre"></pre><div class="tx-linha"><input id="tx-in" class="input" placeholder="Digite o comando e toque em ⏎" autocapitalize="off" autocorrect="off" spellcheck="false"><button class="btn small" id="tx-ok">⏎</button></div>';
      const ir = () => { const i = $('#tx-in'); enviar(i.value + '\r'); i.value = ''; };
      $('#tx-ok').onclick = ir;
      $('#tx-in').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); ir(); } });
    }
  }
  function escreverTela(bytes) {
    if (term) { term.write(bytes); return; }
    const pre = $('#tx-pre'); if (!pre) return;
    // modo simples: tira as cores/comandos de tela (ANSI)
    pre.textContent += dec.decode(bytes).replace(/\x1b\[[0-9;?]*[ -\/]*[@-~]|\x1b\][^\x07]*\x07|\x1b[()][A-Z0-9]|\r(?!\n)/g, '');
    if (pre.textContent.length > 60000) pre.textContent = pre.textContent.slice(-40000);
    pre.scrollTop = pre.scrollHeight;
  }

  // ── conversa no "idioma" do ttyd ────────────────────────────────────────────
  function enviar(texto) { if (ws && ws.readyState === 1) ws.send(enc.encode('0' + texto)); }
  function tamanho() { if (ws && ws.readyState === 1 && term) ws.send(enc.encode('1' + JSON.stringify({ columns: term.cols, rows: term.rows }))); }

  async function conectar() {
    const url = ($('#tx-url').value || PADRAO).trim();
    SK.pref.set('termuxUrl', url);
    if (!/^wss?:\/\//.test(url)) return status('O endereço precisa começar com ws://', 'erro');
    await prepararTela();
    desconectar(true);
    abriu = false; saindo = false;
    status('Chamando o Termux…');
    try { ws = new WebSocket(url, ['tty']); } catch (e) { return status('Endereço inválido: ' + e.message, 'erro'); }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => {
      abriu = true;
      ws.send(enc.encode(JSON.stringify({ AuthToken: '', columns: term ? term.cols : 80, rows: term ? term.rows : 24 })));
      status('✅ Ligado no Termux. Pode digitar.', 'ok');
      $('#tx-con').hidden = true; $('#tx-des').hidden = false;
      if (term) term.focus(); else $('#tx-in') && $('#tx-in').focus();
    };
    ws.onmessage = (ev) => {
      const d = typeof ev.data === 'string' ? enc.encode(ev.data) : new Uint8Array(ev.data);
      if (!d.length) return;
      const cmd = String.fromCharCode(d[0]);
      if (cmd === '0') escreverTela(d.subarray(1));
      // '1' = título da janela, '2' = preferências: não precisamos
    };
    ws.onclose = (ev) => {
      $('#tx-con').hidden = false; $('#tx-des').hidden = true;
      if (!abriu) status('❌ O Termux não respondeu. Confira: o Termux está aberto? Rodou o comando 2 (com -W)? Se o navegador perguntar sobre "dispositivos da rede local", toque em Permitir.', 'erro');
      else status(saindo || ev.code === 1000 ? 'Desligado.' : 'A conexão caiu (o Android pode ter fechado o Termux). Abra o Termux e toque em Conectar de novo.', saindo || ev.code === 1000 ? '' : 'erro');
      ws = null;
    };
    ws.onerror = () => {};
  }
  function desconectar(quieto) { saindo = true; if (ws) { try { ws.close(1000); } catch {} ws = null; } if (!quieto) status('Desligado.'); }

  async function copiar(t) { try { await navigator.clipboard.writeText(t); SK.toast('Copiado. Cole no Termux.'); } catch { SK.prompt('Copie este comando:', t); } }

  function build(el) {
    box = el;
    el.innerHTML =
      '<div class="tx">' +
      '<p class="muted">Liga o Mini SK ao <b>Termux</b> do seu celular — um Linux de verdade. Funciona no PWA e no APK. Serve para coisas básicas: <code>ls</code>, <code>git</code>, <code>python</code>, <code>node</code> (se instalado no Termux).</p>' +
      '<ol class="tx-passos">' +
      '<li>No Termux, <b>só da primeira vez</b>:<div class="tx-cmd"><code>' + CMD_INSTALAR + '</code><button class="btn small" data-copiar="1">Copiar</button></div></li>' +
      '<li>No Termux, <b>toda vez</b> (e deixe o Termux aberto):<div class="tx-cmd"><code>' + CMD_LIGAR + '</code><button class="btn small" data-copiar="2">Copiar</button></div><small class="muted">O <b>-W</b> deixa digitar. O <b>-i 127.0.0.1</b> faz só o seu celular enxergar (ninguém do Wi-Fi entra).</small></li>' +
      '<li>Volte aqui e toque em <b>Conectar</b>.</li>' +
      '</ol>' +
      '<div class="tx-linha"><input id="tx-url" class="input" aria-label="Endereço do Termux" spellcheck="false" autocapitalize="off"><button class="btn primary" id="tx-con">🔌 Conectar</button><button class="btn" id="tx-des" hidden>Desligar</button></div>' +
      '<div id="tx-status" class="tx-status">Desligado.</div>' +
      '<div id="tx-term" class="tx-term"></div>' +
      '<div class="tx-teclas"><button class="btn small" data-t="\x03">Ctrl+C</button><button class="btn small" data-t="\t">Tab</button><button class="btn small" data-t="\x1b[A">↑</button><button class="btn small" data-t="\x1b[B">↓</button><button class="btn small" data-t="\x1b">Esc</button><button class="btn small" data-t="\x04">Ctrl+D</button></div>' +
      '<details class="tx-ajuda"><summary>Não conectou?</summary><ul>' +
      '<li>O Termux precisa estar <b>aberto</b> com o comando 2 rodando (aparece "Listening on port: 7681").</li>' +
      '<li>Se o Android fechar o Termux, rode no Termux: <code>termux-wake-lock</code>.</li>' +
      '<li>No <b>APK</b>: gere o APK de novo pelo 📦 APK (o novo já libera a conexão com o próprio celular).</li>' +
      '<li>No <b>PWA/Chrome</b>: se aparecer pedido de acesso a "dispositivos da rede local", toque em Permitir.</li>' +
      '<li>Se você ligou o ttyd com senha (<code>-c</code>), ligue sem senha — o <code>-i 127.0.0.1</code> já protege.</li>' +
      '</ul></details>' +
      '</div>';
    $('#tx-url').value = SK.pref.get('termuxUrl', PADRAO);
    $('#tx-con').onclick = () => conectar().catch((e) => status('Erro: ' + e.message, 'erro'));
    $('#tx-des').onclick = () => desconectar();
    el.addEventListener('click', (e) => {
      const c = e.target.closest('[data-copiar]'); if (c) copiar(c.dataset.copiar === '1' ? CMD_INSTALAR : CMD_LIGAR);
      const t = e.target.closest('[data-t]'); if (t) { enviar(t.dataset.t); if (term) term.focus(); }
    });
  }

  SK.termux = { build, conectar, desconectar, get ligado() { return !!(ws && ws.readyState === 1); } };
})(window.SK);
