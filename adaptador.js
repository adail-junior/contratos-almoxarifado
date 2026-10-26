// =====================================================================
//  Adaptador: faz o app rodar fora do Claude usando o Supabase
//  (login por e-mail e senha + tabela contratos_docs compartilhada).
//  Não precisa editar este arquivo.
// =====================================================================
(function () {
  'use strict';
  const URL_SB = window.SUPABASE_URL || '', KEY_SB = window.SUPABASE_ANON_KEY || '';
  const ADMINS = (window.ADMINS || []).map(e => String(e).trim().toLowerCase());
  const configurado = /^https?:\/\//.test(URL_SB) && KEY_SB && !/COLE_AQUI/.test(KEY_SB);
  const TABELA = 'contratos_docs';

  // ---------- visual da tela de login ----------
  const css = `
  #auth-ov{position:fixed;inset:0;z-index:50;background:var(--bg,#EEF2F0);display:flex;align-items:center;justify-content:center;padding:24px 16px;overflow:auto}
  #auth-ov .card{background:var(--surface,#fff);border:1px solid var(--line,#CFD8D4);border-radius:8px;padding:24px;width:min(420px,100%);display:grid;gap:14px;color:var(--ink,#14201D)}
  #auth-ov h1{font-family:var(--f-disp,Arial Narrow,sans-serif);font-size:28px;text-transform:uppercase;margin:0}
  #auth-ov p{margin:0;color:var(--muted,#56665F);font-size:13.5px}
  #auth-ov label{display:grid;gap:4px;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#56665F)}
  #auth-ov input{font:15px var(--f-body,system-ui);padding:9px 10px;border:1px solid var(--line,#CFD8D4);border-radius:5px;background:var(--surface,#fff);color:var(--ink,#14201D)}
  #auth-ov .acts{display:flex;gap:8px;flex-wrap:wrap}
  #auth-ov .msg{font-size:13px;min-height:18px;color:var(--bad,#B0281F)}
  #auth-ov .msg.ok{color:var(--ok,#22703A)}
  #auth-ov a{color:var(--accent,#0D6655);cursor:pointer;font-size:13px}
  #auth-user{order:-1;flex-basis:100%;display:flex;gap:8px;align-items:center;justify-content:flex-end;font-size:12px;color:var(--muted,#56665F);margin-bottom:-6px}
  #auth-user button{font:600 12px var(--f-body,system-ui);border:1px solid var(--line,#CFD8D4);background:var(--surface,#fff);color:var(--ink,#14201D);border-radius:5px;padding:4px 9px;cursor:pointer}`;
  const el = html => { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; };
  const onReady = fn => document.readyState !== 'loading' ? fn() : document.addEventListener('DOMContentLoaded', fn);
  const eAdmin = email => ADMINS.includes(String(email || '').toLowerCase());

  let sb = null, usuario = null, resolveLogin;
  const loginPronto = new Promise(r => resolveLogin = r);

  function telaLogin(aviso, ok) {
    let ov = document.getElementById('auth-ov');
    if (!ov) { ov = el('<div id="auth-ov"></div>'); document.body.appendChild(ov); }
    if (!configurado || !window.supabase) {
      ov.innerHTML = `<div class="card"><h1>Contratos AW</h1><p>O site ainda não foi ligado ao Supabase. Preencha o arquivo <b>config-contratos.js</b> com o endereço e a chave do projeto e publique de novo.</p></div>`;
      return;
    }
    ov.innerHTML = `<form class="card" id="auth-form" novalidate>
      <div><h1>Contratos AW</h1><p>Controle dos contratos de EPI e limpeza · Filial 0201 · Armazém 41</p></div>
      <label>E-mail<input id="auth-email" type="email" autocomplete="username" required></label>
      <label>Senha<input id="auth-senha" type="password" autocomplete="current-password" minlength="6" required></label>
      <div class="msg${ok ? ' ok' : ''}" id="auth-msg">${aviso || ''}</div>
      <div class="acts"><button class="btn pri" type="submit">Entrar</button><button class="btn" type="button" id="auth-criar">Criar conta</button></div>
      <a id="auth-reset">Esqueci a senha</a>
    </form>`;
    const msg = (t, okk) => { const m = document.getElementById('auth-msg'); m.textContent = t; m.className = 'msg' + (okk ? ' ok' : ''); };
    const dados = () => [document.getElementById('auth-email').value.trim(), document.getElementById('auth-senha').value];
    const traduz = e => {
      const t = String(e && (e.message || e) || '');
      if (/invalid login credentials/i.test(t)) return 'E-mail ou senha incorretos. Se ainda não tem conta, use Criar conta.';
      if (/email not confirmed/i.test(t)) return 'Confirme seu e-mail pelo link que o sistema enviou e depois clique em Entrar.';
      if (/already registered|already exists/i.test(t)) return 'Esse e-mail já tem conta. Use Entrar (ou Esqueci a senha).';
      if (/at least 6|password/i.test(t)) return 'A senha precisa ter pelo menos 6 caracteres.';
      if (/rate limit|too many/i.test(t)) return 'Muitas tentativas. Espere alguns minutos.';
      if (/fetch|network/i.test(t)) return 'Sem conexão com o Supabase. Confira a internet e o endereço no config-contratos.js.';
      return 'Não foi possível: ' + t;
    };
    document.getElementById('auth-form').addEventListener('submit', async ev => {
      ev.preventDefault(); const [em, se] = dados(); if (!em || !se) return msg('Informe e-mail e senha.');
      msg('Entrando…', true);
      const { error } = await sb.auth.signInWithPassword({ email: em, password: se });
      if (error) msg(traduz(error));
    });
    document.getElementById('auth-criar').addEventListener('click', async () => {
      const [em, se] = dados(); if (!em || !se) return msg('Informe o e-mail e escolha uma senha (mínimo 6 caracteres).');
      msg('Criando conta…', true);
      const { data, error } = await sb.auth.signUp({ email: em, password: se, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) return msg(traduz(error));
      if (!data.session) msg('Conta criada. Abra o e-mail de confirmação que enviamos e depois volte aqui e clique em Entrar.', true);
    });
    document.getElementById('auth-reset').addEventListener('click', async () => {
      const [em] = dados(); if (!em) return msg('Digite seu e-mail acima e clique de novo em Esqueci a senha.');
      const { error } = await sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname });
      error ? msg(traduz(error)) : msg('Enviamos um e-mail para redefinir a senha.', true);
    });
  }

  // tela para definir nova senha (link do e-mail "Esqueci a senha")
  function telaNovaSenha() {
    let ov = document.getElementById('auth-ov');
    if (!ov) { ov = el('<div id="auth-ov"></div>'); document.body.appendChild(ov); }
    ov.innerHTML = `<form class="card" id="ns-form"><h1>Nova senha</h1>
      <label>Nova senha<input id="ns-senha" type="password" minlength="6" autocomplete="new-password" required></label>
      <div class="msg" id="ns-msg"></div><div class="acts"><button class="btn pri" type="submit">Salvar senha</button></div></form>`;
    document.getElementById('ns-form').addEventListener('submit', async ev => {
      ev.preventDefault(); const s = document.getElementById('ns-senha').value;
      const { error } = await sb.auth.updateUser({ password: s });
      const m = document.getElementById('ns-msg');
      if (error) { m.textContent = 'Não foi possível salvar: ' + error.message; return; }
      location.replace(location.origin + location.pathname);
    });
  }

  function barraUsuario(email) {
    const head = document.querySelector('header.top .wrap'); if (!head || document.getElementById('auth-user')) return;
    const b = el(`<div id="auth-user"><span>${String(email).replace(/[<>&]/g, '')}${eAdmin(email) ? ' · administrador' : ''}</span><button type="button">Sair</button></div>`);
    b.querySelector('button').addEventListener('click', async () => { await sb.auth.signOut(); location.reload(); });
    head.appendChild(b);
  }

  // ---------- cópia local da tabela + tempo real ----------
  const rows = new Map();               // path -> data
  const ouvintes = new Set();           // funções a avisar quando algo muda
  let carregado = null;
  const parentDe = p => p.split('/').slice(0, -1).join('/');
  const avisar = () => ouvintes.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  async function recarregar() {
    const todos = []; let de = 0;
    for (;;) {
      const { data, error } = await sb.from(TABELA).select('path,data').range(de, de + 999);
      if (error) throw error;
      todos.push(...data); if (data.length < 1000) break; de += 1000;
    }
    rows.clear(); todos.forEach(r => rows.set(r.path, r.data)); avisar();
  }
  function iniciarSync() {
    if (carregado) return carregado;
    carregado = recarregar();
    sb.channel('contratos-docs').on('postgres_changes', { event: '*', schema: 'public', table: TABELA }, ev => {
      if (ev.eventType === 'DELETE') { if (ev.old && ev.old.path) rows.delete(ev.old.path); }
      else if (ev.new && ev.new.path) rows.set(ev.new.path, ev.new.data);
      avisar();
    }).subscribe();
    // segurança extra: se o tempo real não estiver ligado, atualiza a cada 30 s
    setInterval(() => { if (document.visibilityState === 'visible') recarregar().catch(() => {}); }, 30000);
    return carregado;
  }

  const erroApp = e => {
    const t = String(e && (e.code || '') + ' ' + (e.message || '') || e);
    return { code: /42501|row-level security|permission/i.test(t) ? 'invalid_argument' : 'unavailable', message: (e && e.message) || t };
  };
  const congelar = d => d == null ? d : JSON.parse(JSON.stringify(d));
  function snapDoc(p) { const d = rows.get(p); return { id: p.split('/').pop(), exists: rows.has(p), data: () => congelar(d), metadata: { fromCache: false, hasPendingWrites: false } }; }
  function snapCol(c, lim) {
    let docs = [...rows.keys()].filter(k => parentDe(k) === c).sort().map(snapDoc);
    if (lim) docs = docs.slice(0, lim);
    return { docs, size: docs.length, empty: !docs.length, metadata: { fromCache: false, hasPendingWrites: false }, docChanges: () => [] };
  }
  function docRef(p) {
    return {
      id: p.split('/').pop(), path: p,
      get: async () => { await iniciarSync(); return snapDoc(p); },
      set: async d => {
        const dado = congelar(d);
        const { error } = await sb.from(TABELA).upsert({ path: p, parent: parentDe(p), data: dado, updated_at: new Date().toISOString() });
        if (error) throw erroApp(error);
        rows.set(p, dado); avisar();
      },
      update: async d => docRef(p).set({ ...(rows.get(p) || {}), ...d }),
      delete: async () => {
        const { error } = await sb.from(TABELA).delete().eq('path', p);
        if (error) throw erroApp(error);
        rows.delete(p); avisar();
      },
      onSnapshot: (next, err) => {
        let ultimo; const f = () => { const s = JSON.stringify(rows.get(p)); if (s !== ultimo) { ultimo = s; next(snapDoc(p)); } };
        iniciarSync().then(() => { ouvintes.add(f); f(); }, e => err && err(erroApp(e)));
        return () => ouvintes.delete(f);
      },
      collection: c => colRef(p + '/' + c),
      acquire: async () => null,   // a numeração usa a função do banco (mais segura)
    };
  }
  function colRef(c, lim) {
    return {
      path: c,
      doc: id => docRef(c + '/' + (id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)))),
      add: async d => { const r = docRef(c + '/' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)); await r.set(d); return r; },
      limit: n => colRef(c, n), orderBy: () => colRef(c, lim), where: () => colRef(c, lim),
      get: async () => { await iniciarSync(); return snapCol(c, lim); },
      onSnapshot: (next, err) => {
        let ultimo; const f = () => { const s = snapCol(c, lim); const k = JSON.stringify(s.docs.map(d => [d.id, rows.get(c + '/' + d.id)])); if (k !== ultimo) { ultimo = k; next(s); } };
        iniciarSync().then(() => { ouvintes.add(f); f(); }, e => err && err(erroApp(e)));
        return () => ouvintes.delete(f);
      },
    };
  }

  // numeração única (função contratos_proximo_numero no banco)
  window.__proximoNumero = async minimo => {
    const { data, error } = await sb.rpc('contratos_proximo_numero', { minimo });
    if (error) throw error; return Number(data);
  };

  // ---------- carga inicial (primeiro acesso do administrador) ----------
  async function oferecerCarga() {
    try {
      await iniciarSync();
      if ([...rows.keys()].some(k => k.startsWith('contratos/'))) return;
      const r = await fetch('dados-iniciais.json', { cache: 'no-store' }); if (!r.ok) return;
      const docs = await r.json();
      const n = pre => docs.filter(d => d.path.startsWith(pre)).length;
      const ov = el(`<div id="auth-ov"><div class="card"><h1>Carregar dados</h1>
        <p>A tabela do site está vazia. Quer carregar os dados atuais do app: <b>${n('contratos/')} contratos</b>, <b>${n('solicitacoes/')} solicitações</b> e <b>${n('recebimentos/')} recebimentos</b>, além dos ajustes?</p>
        <div class="msg" id="carga-msg"></div>
        <div class="acts"><button class="btn pri" id="carga-sim">Carregar dados</button><button class="btn" id="carga-nao">Começar vazio</button></div></div></div>`);
      document.body.appendChild(ov);
      await new Promise(res => {
        ov.querySelector('#carga-nao').onclick = () => { ov.remove(); res(); };
        ov.querySelector('#carga-sim').onclick = async () => {
          const m = ov.querySelector('#carga-msg'); m.className = 'msg ok'; m.textContent = 'Carregando…';
          const linhas = docs.map(d => ({ path: d.path, parent: parentDe(d.path), data: d.data, updated_at: new Date().toISOString() }));
          const { error } = await sb.from(TABELA).upsert(linhas);
          if (error) { m.className = 'msg'; m.textContent = 'Não foi possível carregar: ' + error.message + '. Confira se o supabase-tabela.sql foi executado e se seu e-mail está nele.'; return; }
          await recarregar(); ov.remove(); res();
        };
      });
    } catch (e) { console.warn('carga inicial', e); }
  }

  // ---------- interface que o app usa ----------
  const dbApi = { collection: c => colRef(c), doc: p => docRef(p) };
  const userApi = {
    isOwner: async () => eAdmin(usuario && usuario.email),
    canEdit: async () => eAdmin(usuario && usuario.email),
    can: async () => !!usuario,
    id: async () => usuario ? usuario.id : null,
    me: async () => ({ id: usuario && usuario.id, name: (usuario && usuario.email) || '' }),
  };
  const downloadsApi = {
    save: async ({ filename, data }) => {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000); return { status: 'saved' };
    }
  };
  window.claude = { use: async nome => { await loginPronto; return { db: dbApi, user: userApi, downloads: downloadsApi }[nome] || null; } };

  // ---------- início ----------
  onReady(async () => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    if (!configurado || !window.supabase) { telaLogin(); return; }
    sb = window.supabase.createClient(URL_SB, KEY_SB, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'contratos-aw-auth' } });
    const entrou = async sess => {
      if (usuario || !sess) return;
      usuario = sess.user;
      const ov = document.getElementById('auth-ov'); if (ov) ov.remove();
      barraUsuario(usuario.email || '');
      if (eAdmin(usuario.email)) await oferecerCarga();
      resolveLogin();
    };
    sb.auth.onAuthStateChange((ev, sess) => {
      if (ev === 'PASSWORD_RECOVERY') { telaNovaSenha(); return; }
      if (ev === 'SIGNED_OUT') { if (usuario) location.reload(); return; }
      if (sess) entrou(sess);
    });
    const { data } = await sb.auth.getSession();
    if (data && data.session && !/type=recovery/.test(location.hash)) entrou(data.session);
    else if (!/type=recovery/.test(location.hash)) telaLogin();
  });
})();
