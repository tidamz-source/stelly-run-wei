
/* ================= Édition équipes : choix de l'équipe, nom complet, envoi des scores ================= */
// Au tout premier lancement : on choisit son équipe (4 couleurs) et on écrit son nom.
// Chaque partie est envoyée au classement des équipes (moyenne des N meilleurs records, voir backend/Code.gs).
// Le changement d'équipe ou de nom se fait dans Réglages ; un record reste à l'équipe pour laquelle il a été fait.
const WEI_TEAMS = [
  { id:'bleu',  c:'#3FA3E0', d:'#1F5F8F' },
  { id:'rouge', c:'#E8384F', d:'#8E1A2C' },
  { id:'jaune', c:'#FFCF00', d:'#A07A00' },
  { id:'vert',  c:'#3DBE5A', d:'#1E6E31' }
];
const WEI_BONUS = 1000;   // disques offerts au premier choix d'équipe
// Stelly prend la couleur de son équipe (en jeu et dans les aperçus de la boutique) ; Jaune : sa couleur d'origine
const WEI_PAL = {
  bleu:  { yellow:'#3FA3E0', yellowL:'#86CBF2', yellowM:'#62B8EC', orange:'#2B7DB8', orangeD:'#1F5F8F', cheek:'#9AD6F7' },
  rouge: { yellow:'#E8384F', yellowL:'#FF7686', yellowM:'#F5596A', orange:'#B5243A', orangeD:'#8E1A2C', cheek:'#FF9AA8' },
  jaune: null,
  vert:  { yellow:'#3DBE5A', yellowL:'#84DE98', yellowM:'#5FCE76', orange:'#2A9443', orangeD:'#1E6E31', cheek:'#94E5A6' }
};
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
  css.textContent = '#wei{ position:absolute; inset:0; z-index:45; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:calc(var(--s)*3px); padding:calc(var(--s)*4px); box-sizing:border-box;'
    + ' background:radial-gradient(ellipse at 50% 115%, rgba(255,207,0,.22), transparent 55%), radial-gradient(ellipse at 50% -20%, rgba(165,139,198,.35), transparent 60%),'
    + ' repeating-linear-gradient(135deg, rgba(255,255,255,.035) 0 calc(var(--s)*6px), transparent 0 calc(var(--s)*12px)), var(--plum); }'
    + '#wei[hidden]{ display:none; }'
    + '#wei h2{ margin:0; font-size:max(calc(var(--s)*11px),20px); color:var(--yellow); -webkit-text-stroke:calc(var(--s)*1.4px) var(--plum); paint-order:stroke fill; text-shadow:0 calc(var(--s)*1.6px) 0 var(--orange), 0 calc(var(--s)*2.6px) 0 #000; letter-spacing:.02em; text-align:center; }'
    + '#wei .sub{ margin:calc(var(--s)*-1px) 0 calc(var(--s)*5px); font-weight:700; font-size:max(calc(var(--s)*4.6px),10px); color:var(--purple-l); letter-spacing:.06em; text-transform:uppercase; text-align:center; }'
    + '#weiteams{ display:flex; gap:calc(var(--s)*8px); align-items:flex-end; }'
    + '#weiteams button{ font:inherit; position:relative; width:calc(var(--s)*52px); height:calc(var(--s)*70px); padding:0; border-radius:calc(var(--s)*4px); border:calc(var(--s)*1.6px) solid #000; overflow:hidden; cursor:pointer;'
    + ' background:linear-gradient(170deg, var(--c) 0 58%, var(--d) 58%); box-shadow:inset 0 calc(var(--s)*-3px) 0 rgba(0,0,0,.25), 0 calc(var(--s)*3px) 0 #000; transition:transform .15s, filter .15s; filter:saturate(.75) brightness(.8); }'
    + '#weiteams button::before{ content:""; position:absolute; inset:0; background:repeating-linear-gradient(90deg, rgba(255,255,255,.07) 0 calc(var(--s)*4px), transparent 0 calc(var(--s)*8px)); }'
    + '#weiteams .ray{ position:absolute; left:50%; top:38%; width:calc(var(--s)*80px); height:calc(var(--s)*80px); transform:translate(-50%,-50%); background:repeating-conic-gradient(rgba(255,255,255,.16) 0 10deg, transparent 10deg 30deg); border-radius:50%; opacity:0; animation:weispin 9s linear infinite; }'
    + '@keyframes weispin{ to{ transform:translate(-50%,-50%) rotate(360deg); } }'
    + '#weiteams canvas{ position:absolute; left:50%; bottom:calc(var(--s)*17px); transform:translateX(-50%); height:calc(var(--s)*52px); width:auto; image-rendering:pixelated; }'
    + '#weiteams .nm{ position:absolute; left:0; right:0; bottom:calc(var(--s)*7.5px); text-align:center; font-weight:700; font-size:max(calc(var(--s)*6.5px),13px); color:#fff; -webkit-text-stroke:calc(var(--s)*1px) #000; paint-order:stroke fill; letter-spacing:.04em; text-transform:uppercase; }'
    + '#weiteams .ct{ position:absolute; left:0; right:0; bottom:calc(var(--s)*2.5px); text-align:center; font-weight:700; font-size:max(calc(var(--s)*3.6px),8px); color:rgba(255,255,255,.85); min-height:1em; }'
    + '#weiteams button.on{ transform:translateY(calc(var(--s)*-5px)) scale(1.08); filter:none; border-color:#fff;'
    + ' box-shadow:inset 0 calc(var(--s)*-3px) 0 rgba(0,0,0,.25), 0 calc(var(--s)*3px) 0 #000, 0 0 0 calc(var(--s)*2px) var(--yellow), 0 0 calc(var(--s)*14px) var(--c); }'
    + '#weiteams button.on .ray{ opacity:1; }'
    + '#weiteams button.on::after{ content:"✓"; position:absolute; top:calc(var(--s)*2.5px); right:calc(var(--s)*2.5px); width:calc(var(--s)*9px); height:calc(var(--s)*9px); border-radius:50%; background:var(--yellow); color:var(--plum);'
    + ' border:calc(var(--s)*1px) solid #000; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:max(calc(var(--s)*5px),10px); }'
    + '#weirow{ display:flex; align-items:center; gap:calc(var(--s)*4px); margin-top:calc(var(--s)*9px); }'
    + '#weiname{ width:calc(var(--s)*92px); max-width:44vw; box-sizing:border-box; font:inherit; font-weight:700; font-size:max(calc(var(--s)*6px),15px); padding:calc(var(--s)*2.5px) calc(var(--s)*4px);'
    + ' border:calc(var(--s)*1.5px) solid #000; border-radius:calc(var(--s)*2.5px); background:#fff; color:var(--plum); text-align:center; outline:none; box-shadow:0 calc(var(--s)*2px) 0 #000; }'
    + '#weiname:focus{ box-shadow:0 calc(var(--s)*2px) 0 #000, 0 0 0 calc(var(--s)*1.5px) var(--yellow); }'
    + '#weimsg{ margin:0; min-height:1.2em; font-weight:700; font-size:max(calc(var(--s)*4.5px),11px); color:#FF9AA8; text-align:center; }'
    + '#weinote{ margin:0; font-size:max(calc(var(--s)*4.2px),10px); color:var(--purple-l); text-align:center; max-width:calc(var(--s)*200px); }'
    + '#weigo, #weicancel{ position:relative; font-size:max(calc(var(--s)*7px),14px); }'
    + '#weigift{ position:absolute; left:50%; top:calc(var(--s)*-9px); transform:translateX(-50%) rotate(-4deg); display:flex; align-items:center; gap:calc(var(--s)*1.5px); white-space:nowrap; padding:calc(var(--s)*.8px) calc(var(--s)*3px);'
    + ' border-radius:calc(var(--s)*2px); background:#3DBE5A; border:calc(var(--s)*1px) solid #000; color:#fff; font-family:var(--num); font-size:max(calc(var(--s)*3.6px),8px); text-shadow:0 1px 0 #000; pointer-events:none; }'
    + '#weigift[hidden]{ display:none; } #weigift canvas{ height:calc(var(--s)*4.5px); width:auto; image-rendering:pixelated; }'
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
    + '#settings .xh, #settings .xsub, #settings .xrow, #xsync, #xunlink, #dqbtn{ display:none !important; }'
    + '#install{ top:calc(var(--s)*22px) !important; }'   // sous l'étiquette d'équipe
    + '#weires{ position:absolute; inset:0; z-index:44; background:var(--plum); }'
    + '#weires[hidden]{ display:none; }'
    + '#weires iframe{ position:absolute; inset:0; width:100%; height:100%; border:0; background:var(--plum); }'
    + '#weires .btn{ position:absolute; z-index:1; top:calc(var(--s)*5px); right:calc(var(--s)*5px); }';
  document.head.appendChild(css);

  // ---------- écran de choix : 4 cartes « maillot », Stelly aux couleurs de chaque équipe ----------
  const page = document.createElement('div'); page.id = 'wei'; page.hidden = true; page.setAttribute('role', 'dialog'); page.setAttribute('aria-modal', 'true');
  page.innerHTML = '<h2></h2><p class="sub"></p><div id="weiteams"></div>'
    + '<div id="weirow"><input id="weiname" maxlength="40" autocomplete="name" spellcheck="false"><button type="button" class="btn alt" id="weicancel" hidden></button>'
    + '<button type="button" class="btn" id="weigo"><span id="weigift" hidden></span><span class="lab"></span></button></div><p id="weimsg"></p><p id="weinote" hidden></p>';
  $('news').parentElement.appendChild(page);
  const grid = page.querySelector('#weiteams'), inp = page.querySelector('#weiname'), msg = page.querySelector('#weimsg'), note = page.querySelector('#weinote');
  const go = page.querySelector('#weigo'), cancel = page.querySelector('#weicancel'), gift = page.querySelector('#weigift');
  let pick = null, isOpen = false, after = null, counts = {};
  const card = {};
  const sprite = (t, pose) => { const c = mk(SW, SH + PAD); c.opt = pose; c.weiTeam = t.id; paintStelly(c, {}); return c; };
  function cards(){
    grid.textContent = '';
    for (const t of WEI_TEAMS){
      const b = document.createElement('button'); b.type = 'button'; b.dataset.id = t.id; b.style.setProperty('--c', t.c); b.style.setProperty('--d', t.d);
      b.classList.toggle('on', pick === t.id); b.setAttribute('aria-pressed', pick === t.id ? 'true' : 'false');
      const ray = document.createElement('i'); ray.className = 'ray';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = tName(t);
      const ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = counts[t.id] != null ? txt(counts[t.id] > 1 ? 'wei.players' : 'wei.player', { n: counts[t.id] }) : '';
      b.append(ray, sprite(t, pick === t.id ? POSES.apex : POSES.run[0]), nm, ct);
      b.addEventListener('click', e => { e.stopPropagation(); pick = t.id; msg.textContent = ''; sfx.disc(1); cards(); });
      grid.appendChild(b); card[t.id] = b;
    }
  }
  // nombre de joueurs par équipe, en direct
  async function loadCounts(){
    if (!WEI_URL) return;
    try { const r = await (await fetch(WEI_URL + '?id=' + encodeURIComponent(LB.id), { cache:'no-store' })).json();
      if (r && r.teams){ r.teams.forEach(t => counts[t.id] = t.players || 0); if (isOpen) cards(); } } catch(e){}
  }
  function texts(){
    page.querySelector('h2').textContent = txt('wei.pick'); page.querySelector('.sub').textContent = txt('wei.sub');
    inp.placeholder = txt('wei.name'); inp.setAttribute('aria-label', txt('wei.name'));
    go.querySelector('.lab').textContent = txt(team() && name() ? 'wei.ok' : 'wei.go'); cancel.textContent = txt('ui.close'); note.textContent = txt('wei.move');
    gift.hidden = !!TR.d.weiBonus; gift.innerHTML = ''; gift.append('+' + fmtN(WEI_BONUS) + ' ', cvOf(DISC), ' ' + txt('wei.gift'));
  }
  function open(then){
    after = then || null; const first = !team() || !name();
    pick = team() ? team().id : null; inp.value = name(); msg.textContent = '';
    cancel.hidden = first; note.hidden = first; texts(); cards(); loadCounts();
    page.hidden = false; isOpen = true; $('soundmenu').hidden = true; $('langbtn').hidden = true;
  }
  function close(){ page.hidden = true; isOpen = false; if (state === 'title') $('langbtn').hidden = false; }
  function submit(){
    const n = clean(inp.value);
    if (!pick){ msg.textContent = txt('wei.needTeam'); return; }
    if (n.length < 2){ msg.textContent = txt('wei.needName'); inp.focus(); return; }
    const before = team() && team().id, beforeN = name(), changed = before && (before !== pick || beforeN !== n);
    set(K_TEAM, pick); set(K_NAME, n); sfx.sock(); close(); paint(); repaintStelly();
    // bonus de bienvenue : une seule fois par partie sauvegardée (pas à chaque changement d'équipe)
    if (!TR.d.weiBonus){ TR.d.weiBonus = 1; TR.d.coins += WEI_BONUS; TR.save(); setTimeout(() => { toast(txt('wei.bonus', { n: fmtN(WEI_BONUS) }), true); sfx.mile(); }, 300); }
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

  // résultats des équipes : dans le jeu (une page à part ferait sortir l'appli du mode paysage)
  const res = document.createElement('div'); res.id = 'weires'; res.hidden = true; res.setAttribute('role', 'dialog'); res.setAttribute('aria-modal', 'true');
  const rClose = document.createElement('button'); rClose.type = 'button'; rClose.className = 'btn alt'; res.appendChild(rClose);
  $('news').parentElement.appendChild(res);
  let resOpen = false;
  function results(){ if (resOpen || state !== 'title') return; resOpen = true; rClose.textContent = txt('ui.close');
    const f = document.createElement('iframe'); f.title = txt('wei.results'); f.src = 'equipes.html?embed=1&v=' + WEI_REV; /* numéro de version : jamais l'ancienne page gardée en cache */ res.insertBefore(f, rClose);
    res.hidden = false; $('soundmenu').hidden = true; $('langbtn').hidden = true; sfx.start(); }
  function closeRes(){ if (!resOpen) return; resOpen = false; res.hidden = true; const f = res.querySelector('iframe'); if (f) f.remove(); if (state === 'title') $('langbtn').hidden = false; }
  rClose.addEventListener('click', e => { e.stopPropagation(); closeRes(); });
  res.addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('keydown', e => { if (!resOpen) return; e.stopPropagation(); if (e.code === 'Escape' || e.code === 'Space'){ e.preventDefault(); if (e.code === 'Escape') closeRes(); } }, true);

  // ---------- Stelly aux couleurs de son équipe ----------
  // le corps prend la palette de l'équipe ; un costume porté (nœud, cravate, cape) garde son motif mais ne change plus la couleur
  { const p0 = paintStelly;
    paintStelly = function(c, eq){
      const t = c.weiTeam ? teamOf(c.weiTeam) : team(), pal = t && WEI_PAL[t.id];
      if (!pal || c.bare) return p0.call(this, c, eq);
      const e = Object.assign({}, eq || EQUIPPED); e.shirt = Object.assign({}, e.shirt || {}, { pal, sheen:false });
      return p0.call(this, c, e);
    }; }
  // « Tout remettre à zéro » : on repart aussi du choix d'équipe (et du bonus de bienvenue)
  { const r0 = resetAll;
    resetAll = function(){ r0.apply(this, arguments); delete TR.d.weiBonus; TR.save(); try { localStorage.removeItem(K_TEAM); localStorage.removeItem(K_NAME); } catch(e){} paint(); repaintStelly(); };
    new MutationObserver(() => { if (!setUI.isOpen() && state === 'title' && (!team() || !name()) && !isOpen) setTimeout(() => { if (!setUI.isOpen() && (!team() || !name()) && !isOpen) open(); }, 500); })
      .observe($('settings'), { attributes:true, attributeFilter:['class', 'hidden'] }); }

  if (!ATELIER){ flush(); addEventListener('online', flush); }
  paint(); repaintStelly();
  // joueurs qui avaient déjà choisi leur équipe avant le bonus de bienvenue : ils le reçoivent une fois
  if (team() && name() && !TR.d.weiBonus){ TR.d.weiBonus = 1; TR.d.coins += WEI_BONUS; TR.save(); setTimeout(() => toast(txt('wei.bonus', { n: fmtN(WEI_BONUS) }), true), 1500); }
  if (!team() || !name()) open();
  return { need: () => !team() || !name(), open, isOpen: () => isOpen || resOpen, results, send, flush, paint, team, name };
})();
