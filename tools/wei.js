
/* ================= Édition équipes : choix de l'équipe, nom complet, envoi des scores ================= */
// Au tout premier lancement : on choisit son équipe (4 couleurs) et on écrit son nom.
// Chaque partie est envoyée au classement des équipes (moyenne des N meilleurs records, voir backend/Code.gs).
// Le changement d'équipe ou de nom se fait dans Réglages ; le record suit le joueur.
const WEI_TEAMS = [
  { id:'bleu',  c:'#3FA3E0', d:'#1F5F8F' },
  { id:'rouge', c:'#E8384F', d:'#8E1A2C' },
  { id:'jaune', c:'#FFCF00', d:'#A07A00' },
  { id:'vert',  c:'#3DBE5A', d:'#1E6E31' }
];
const WEI = (() => {
  const K_TEAM = 'stellyrunwei_team', K_NAME = 'stellyrunwei_fullname', K_Q = 'stellyrunwei_queue';
  const get = k => { try { return localStorage.getItem(k); } catch(e){ return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch(e){} };
  const teamOf = id => WEI_TEAMS.find(t => t.id === id) || null;
  const team = () => teamOf(get(K_TEAM));
  const name = () => (get(K_NAME) || '').trim();
  const tName = t => txt('wei.t.' + t.id);
  const clean = s => String(s || '').replace(/[<>"\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const post = async o => { const r = await fetch(WEI_URL, { method:'POST', headers:{ 'Content-Type':'text/plain;charset=utf-8' }, body: JSON.stringify(o) }); return r.json(); };

  // ---------- styles ----------
  const css = document.createElement('style');
  css.textContent = '#wei{ position:absolute; inset:0; z-index:45; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:calc(var(--s)*5px);'
    + ' background:repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 calc(var(--s)*6px), transparent 0 calc(var(--s)*12px)), var(--plum); padding:calc(var(--s)*4px); box-sizing:border-box; }'
    + '#wei[hidden]{ display:none; }'
    + '#wei h2{ margin:0; font-size:max(calc(var(--s)*9px),18px); color:var(--yellow); -webkit-text-stroke:calc(var(--s)*1.2px) var(--plum); paint-order:stroke fill; text-shadow:0 calc(var(--s)*1.5px) 0 #000; text-align:center; }'
    + '#weiteams{ display:flex; gap:calc(var(--s)*5px); }'
    + '#weiteams button{ font:inherit; position:relative; width:calc(var(--s)*40px); height:calc(var(--s)*46px); border:calc(var(--s)*1.5px) solid var(--plum); border-radius:calc(var(--s)*3px); cursor:pointer; padding:0;'
    + ' display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:calc(var(--s)*1px); padding-bottom:calc(var(--s)*3px); box-sizing:border-box;'
    + ' box-shadow:inset 0 calc(var(--s)*-3px) 0 rgba(0,0,0,.25), 0 calc(var(--s)*2.5px) 0 #000; transition:transform .12s; opacity:.55; }'
    + '#weiteams button canvas{ height:calc(var(--s)*28px); width:auto; image-rendering:pixelated; }'
    + '#weiteams button b{ font-size:max(calc(var(--s)*5.5px),11px); color:#fff; -webkit-text-stroke:calc(var(--s)*.9px) var(--plum); paint-order:stroke fill; letter-spacing:.04em; }'
    + '#weiteams button.on{ opacity:1; transform:translateY(calc(var(--s)*-3px)) scale(1.06); outline:calc(var(--s)*1.5px) solid #fff; outline-offset:calc(var(--s)*1px); }'
    + '#weiteams button.on::after{ content:"✓"; position:absolute; top:calc(var(--s)*-4px); right:calc(var(--s)*-4px); width:calc(var(--s)*9px); height:calc(var(--s)*9px); border-radius:50%;'
    + ' background:#fff; color:var(--plum); font-weight:700; font-size:max(calc(var(--s)*5px),10px); display:flex; align-items:center; justify-content:center; border:calc(var(--s)*1px) solid var(--plum); }'
    + '#weiname{ width:min(calc(var(--s)*150px), 86vw); box-sizing:border-box; font:inherit; font-weight:700; font-size:max(calc(var(--s)*6px),16px); padding:calc(var(--s)*2.5px) calc(var(--s)*4px);'
    + ' border:calc(var(--s)*1.5px) solid var(--plum); border-radius:calc(var(--s)*2px); background:#fff; color:var(--plum); text-align:center; outline:none; }'
    + '#weiname:focus{ box-shadow:0 0 0 calc(var(--s)*1.5px) var(--yellow); }'
    + '#weimsg{ margin:0; min-height:1.2em; font-weight:700; font-size:max(calc(var(--s)*4.5px),11px); color:#FF9AA8; text-align:center; }'
    + '#weinote{ margin:0; font-size:max(calc(var(--s)*4.2px),10px); color:var(--purple-l); text-align:center; max-width:calc(var(--s)*170px); }'
    + '#weigo, #weicancel{ font-size:max(calc(var(--s)*7px),14px); }'
    + '#weirow{ display:flex; gap:calc(var(--s)*4px); }'
    + '#weitag{ display:inline-flex; align-items:center; gap:calc(var(--s)*1.5px); margin-top:calc(var(--s)*1.5px); padding:calc(var(--s)*.6px) calc(var(--s)*2.5px); border-radius:calc(var(--s)*2px);'
    + ' border:calc(var(--s)*.8px) solid var(--plum); color:#fff; font-weight:700; font-size:max(calc(var(--s)*4px),9px); letter-spacing:.05em; text-transform:uppercase; -webkit-text-stroke:calc(var(--s)*.6px) var(--plum); paint-order:stroke fill; pointer-events:none; }'
    + '#weititle{ position:absolute; top:calc(var(--s)*4px); left:calc(var(--s)*4px); z-index:2; display:flex; align-items:center; gap:calc(var(--s)*2px); max-width:40%;'
    + ' padding:calc(var(--s)*1.5px) calc(var(--s)*3.5px) calc(var(--s)*1.5px) calc(var(--s)*2px); border-radius:calc(var(--s)*3px); border:calc(var(--s)*1.2px) solid var(--plum); background:rgba(255,255,255,.92);'
    + ' box-shadow:0 calc(var(--s)*1.5px) 0 var(--plum); color:var(--plum); font-weight:700; font-size:max(calc(var(--s)*4.4px),10px); line-height:1.15; }'
    + '#weititle i{ flex:none; width:calc(var(--s)*7px); height:calc(var(--s)*7px); border-radius:calc(var(--s)*1.5px); border:calc(var(--s)*1px) solid var(--plum); }'
    + '#weititle span{ display:flex; flex-direction:column; min-width:0; } #weititle em{ font-style:normal; font-size:.85em; opacity:.75; } #weititle b{ white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }'
    + '.weiset{ display:flex; align-items:center; justify-content:center; gap:calc(var(--s)*4px); margin:calc(var(--s)*3px) auto calc(var(--s)*2px); flex-wrap:wrap; }'
    + '.weiset .chip{ display:flex; align-items:center; gap:calc(var(--s)*2px); padding:calc(var(--s)*2px) calc(var(--s)*4px); border-radius:calc(var(--s)*2.5px); border:calc(var(--s)*1.2px) solid var(--plum); background:#fff; color:var(--plum); font-weight:700; font-size:max(calc(var(--s)*5px),11px); }'
    + '.weiset .chip i{ width:calc(var(--s)*7px); height:calc(var(--s)*7px); border-radius:calc(var(--s)*1.5px); border:calc(var(--s)*1px) solid var(--plum); }'
    + '.weiset .btn{ font-size:max(calc(var(--s)*5.5px),11px); padding:calc(var(--s)*1.5px) calc(var(--s)*5px) calc(var(--s)*2.5px); }'
    + '#settings .xh, #settings .xsub, #settings .xrow, #xsync, #xunlink{ display:none !important; }';
  document.head.appendChild(css);

  // ---------- écran de choix ----------
  const page = document.createElement('div'); page.id = 'wei'; page.hidden = true; page.setAttribute('role', 'dialog'); page.setAttribute('aria-modal', 'true');
  page.innerHTML = '<h2></h2><div id="weiteams"></div><input id="weiname" maxlength="40" autocomplete="name" spellcheck="false"><p id="weimsg"></p><p id="weinote" hidden></p>'
    + '<div id="weirow"><button type="button" class="btn alt" id="weicancel" hidden></button><button type="button" class="btn" id="weigo"></button></div>';
  $('news').parentElement.appendChild(page);
  const grid = page.querySelector('#weiteams'), inp = page.querySelector('#weiname'), msg = page.querySelector('#weimsg'), note = page.querySelector('#weinote');
  const go = page.querySelector('#weigo'), cancel = page.querySelector('#weicancel');
  let pick = null, isOpen = false, after = null;
  function cards(){
    grid.textContent = '';
    for (const t of WEI_TEAMS){
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = t.id; b.style.background = 'linear-gradient(' + t.c + ' 0 62%, ' + t.d + ' 62%)';
      b.classList.toggle('on', pick === t.id); b.setAttribute('aria-pressed', pick === t.id ? 'true' : 'false');
      b.appendChild(cvOf(RUN[0])); const l = document.createElement('b'); l.textContent = tName(t); b.appendChild(l);
      b.addEventListener('click', e => { e.stopPropagation(); pick = t.id; msg.textContent = ''; sfx.disc(1); cards(); });
      grid.appendChild(b);
    }
  }
  function texts(){
    page.querySelector('h2').textContent = txt('wei.pick'); inp.placeholder = txt('wei.name'); inp.setAttribute('aria-label', txt('wei.name'));
    go.textContent = txt(team() && name() ? 'wei.ok' : 'wei.go'); cancel.textContent = txt('ui.close'); note.textContent = txt('wei.move');
  }
  function open(then){
    after = then || null; const first = !team() || !name();
    pick = team() ? team().id : null; inp.value = name(); msg.textContent = '';
    cancel.hidden = first; note.hidden = first; texts(); cards();
    page.hidden = false; isOpen = true; $('soundmenu').hidden = true; $('langbtn').hidden = true;
  }
  function close(){ page.hidden = true; isOpen = false; if (state === 'title') $('langbtn').hidden = false; }
  function submit(){
    const n = clean(inp.value);
    if (!pick){ msg.textContent = txt('wei.needTeam'); return; }
    if (n.length < 2){ msg.textContent = txt('wei.needName'); inp.focus(); return; }
    const before = team() && team().id, beforeN = name(), changed = before && (before !== pick || beforeN !== n);
    set(K_TEAM, pick); set(K_NAME, n); sfx.sock(); close(); paint();
    if (changed) profile();
    const f = after; after = null; if (f) f();
  }
  go.addEventListener('click', e => { e.stopPropagation(); submit(); });
  cancel.addEventListener('click', e => { e.stopPropagation(); close(); });
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') submit(); });
  inp.addEventListener('input', () => { msg.textContent = ''; });
  page.addEventListener('pointerdown', e => e.stopPropagation());
  page.addEventListener('click', e => e.stopPropagation());

  // ---------- étiquettes : écran titre, partie, réglages ----------
  const tTitle = document.createElement('div'); tTitle.id = 'weititle'; tTitle.innerHTML = '<i></i><span><em></em><b></b></span>'; $('title').appendChild(tTitle);
  const tHud = document.createElement('div'); tHud.id = 'weitag'; $('hi').after(tHud);
  const setBox = document.createElement('div'); setBox.className = 'weiset';
  setBox.innerHTML = '<span class="chip"><i></i><b></b></span><button type="button" class="btn alt"></button>';
  $('setclose').after(setBox);
  setBox.querySelector('button').addEventListener('click', e => { e.stopPropagation(); open(); });
  { const h = document.createElement('h3'); h.className = 'xh weih'; h.style.display = 'block'; $('setclose').after(h); }
  function paint(){
    const t = team(), n = name();
    tTitle.hidden = !t; tHud.hidden = !t;
    if (!t) return;
    tTitle.querySelector('i').style.background = t.c; tTitle.querySelector('em').textContent = txt('wei.team', { t: tName(t) }); tTitle.querySelector('b').textContent = n;
    tHud.style.background = t.c; tHud.textContent = tName(t);
    setBox.querySelector('i').style.background = t.c; setBox.querySelector('b').textContent = txt('wei.team', { t: tName(t) }) + ' · ' + n;
    setBox.querySelector('button').textContent = txt('wei.change'); document.querySelector('.weih').textContent = txt('wei.mine');
    $('ver').textContent = 'v' + APP_VERSION + ' · ' + txt('wei.edition');
  }

  // ---------- envoi des scores ----------
  const queue = () => { try { return JSON.parse(get(K_Q) || '[]'); } catch(e){ return []; } };
  const saveQ = q => set(K_Q, JSON.stringify(q.slice(-30)));
  const rnd = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  let flushing = false, lastRes = null;
  async function flush(){
    if (flushing || !WEI_URL) return lastRes; flushing = true;
    try {
      let q = queue();
      while (q.length){
        const r = q[0];
        const sig = cyrb53([LB.id, r.name, r.team, r.score, r.t, r.discs, r.rid].join('|') + '|' + WEI_SECRET);
        const j = await post({ action:'score', id: LB.id, name: r.name, team: r.team, score: r.score, t: r.t, discs: r.discs, rid: r.rid, v: APP_VERSION, sig });
        if (!j || (!j.ok && j.err !== 'bad' && j.err !== 'score')) break;   // erreur serveur : on réessaiera plus tard
        q = queue(); q.shift(); saveQ(q); lastRes = Object.assign({ for: r.rid }, j);
      }
    } catch(e){}
    flushing = false; return lastRes;
  }
  async function profile(){
    const t = team(), n = name(); if (!t || !WEI_URL) return;
    try { await post({ action:'profile', id: LB.id, name: n, team: t.id, v: APP_VERSION, sig: cyrb53([LB.id, n, t.id].join('|') + '|' + WEI_SECRET) }); } catch(e){}
  }
  async function send(score, tm, discs){
    const t = team(), res = $('lbres'); if (!t) return;
    const rid = rnd(); const q = queue(); q.push({ rid, name: name(), team: t.id, score: Math.floor(score), t: Math.round(tm || 0), discs: discs | 0 }); saveQ(q);
    res.hidden = false; res.textContent = txt('lb.sending');
    const j = await flush();
    if (state !== 'over') return;
    if (!j || j.for !== rid){ res.textContent = txt('wei.later'); return; }
    const mine = j.teams && j.teams.find(x => x.id === t.id);
    res.textContent = (j.record ? txt('wei.record', { t: tName(t) }) : txt('wei.sent', { t: tName(t) })) + (mine && mine.rank ? ' · ' + txt('wei.rank', { n: mine.rank }) : '');
  }

  if (!ATELIER){ flush(); addEventListener('online', flush); }
  paint();
  if (!team() || !name()) open();
  return { need: () => !team() || !name(), open, isOpen: () => isOpen, send, flush, paint, team, name };
})();
