/**
 * Stelly Run — édition équipes : classement des équipes (Google Apps Script + Google Sheet)
 *
 * Installation (une seule fois) :
 *  1. Crée une Google Sheet vide (par exemple « Stelly Run équipes »).
 *  2. Menu Extensions > Apps Script. Remplace tout le contenu de Code.gs par ce fichier. Enregistre.
 *  3. Bouton « Déployer » > « Nouveau déploiement » > type « Application Web ».
 *     Exécuter en tant que : Moi. Qui a accès : Tout le monde. Déployer, puis autoriser.
 *  4. Copie l'URL qui finit par /exec et donne-la à Claude (elle va dans index.html et equipes.html).
 *
 * Classement : moyenne des 3 meilleurs records de chaque équipe (TOP_N).
 * Une équipe qui a moins de 3 joueurs : moyenne de ceux qu'elle a.
 * Un record reste à l'équipe pour laquelle il a été fait : un joueur qui change d'équipe repart de zéro
 * dans la nouvelle (onglet « Joueurs » : une ligne par joueur ET par équipe).
 * Mise à jour depuis une ancienne version : lancer une fois la fonction reconstruire() (menu Exécuter),
 * qui refait l'onglet « Joueurs » à partir de l'historique des parties.
 * Stats d'équipe (page stats.html) : compteurs de chaque joueur (onglet « Stats »), additionnés par équipe.
 */
const SECRET = 'wei-st3lly-4q8z';   // même clé que dans index.html (WEI_SECRET)
const TEAMS = ['bleu', 'rouge', 'jaune', 'vert'];
const TOP_N = 3;   // nombre de meilleurs records comptés par équipe
const STATS_SECRET = 'lg-st3lly-9f2k';   // clé des stats envoyées par le jeu
const SUM = ['games', 'discs', 'rb', 'spent', 'sharks', 'ko', 'doe', 'stag', 'dist', 'missed', 'fires', 'socks', 'slows', 'time', 'combo', 'superC', 'mega', 'giga'];
const COLS = ['id', 'name', 'team', 'best', 'bestT', 'bestDiscs', 'games', 'total', 'created', 'updated'];

function cyrb53(str, seed) {
  seed = seed || 0;
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) { const ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

function sheet_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); }
  return sh;
}
const players_ = () => sheet_('Joueurs', COLS);
const stats_ = () => sheet_('Stats', ['id', 'name', 'team', 'json', 'updated']);
const runs_ = () => sheet_('Parties', ['date', 'id', 'name', 'team', 'score', 'secondes', 'disques', 'version']);

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
const cleanName_ = s => String(s || '').replace(/[<>"\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);

function readAll_() {
  const sh = players_(), v = sh.getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < v.length; i++) { const r = {}; COLS.forEach((c, k) => r[c] = v[i][k]); r.row = i + 1; if (r.id) rows.push(r); }
  return { sh, rows };
}
function writeRow_(sh, r) { sh.getRange(r.row, 1, 1, COLS.length).setValues([COLS.map(c => r[c])]); }

function doPost(e) {
  let o; try { o = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, err: 'json' }); }
  if (o.action === 'stats') return json_(saveStats_(o));
  const id = String(o.id || '').slice(0, 40), name = cleanName_(o.name), team = String(o.team || '');
  if (!/^[a-z0-9]{6,40}$/.test(id) || !name || TEAMS.indexOf(team) < 0) return json_({ ok: false, err: 'bad' });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { sh, rows } = readAll_(), now = new Date();
    let r = rows.find(x => x.id === id && x.team === team);   // une ligne par joueur et par équipe
    if (o.action === 'profile') {
      // changement de nom : sur toutes ses lignes ; changement d'équipe : rien ne bouge, le record reste à l'ancienne équipe
      if (o.sig !== cyrb53([id, name, team].join('|') + '|' + SECRET)) return json_({ ok: false, err: 'sig' });
      rows.filter(x => x.id === id && x.name !== name).forEach(x => { x.name = name; writeRow_(sh, x); });
      return json_({ ok: true });
    }
    if (o.action === 'score') {
      const score = Math.floor(+o.score), t = Math.round(+o.t || 0), discs = Math.floor(+o.discs || 0), rid = String(o.rid || '').slice(0, 40);
      if (o.sig !== cyrb53([id, name, team, score, t, discs, rid].join('|') + '|' + SECRET)) return json_({ ok: false, err: 'sig' });
      if (!isFinite(score) || score < 0 || score > 50000000) return json_({ ok: false, err: 'score' });
      // une même partie renvoyée deux fois (réseau coupé) n'est comptée qu'une fois
      const cache = CacheService.getScriptCache();
      if (rid && cache.get('r' + rid)) return json_(Object.assign({ ok: true, dup: true }, meOf_(id, team)));
      if (rid) cache.put('r' + rid, '1', 21600);
      if (!r) { r = { id, name, team, best: 0, bestT: 0, bestDiscs: 0, games: 0, total: 0, created: now, updated: now, row: sh.getLastRow() + 1 }; }
      rows.filter(x => x.id === id && x !== r && x.name !== name).forEach(x => { x.name = name; writeRow_(sh, x); });
      r.name = name; r.games = (+r.games || 0) + 1; r.total = (+r.total || 0) + score; r.updated = now;
      const rec = score > (+r.best || 0);
      if (rec) { r.best = score; r.bestT = t; r.bestDiscs = discs; }
      writeRow_(sh, r);
      runs_().appendRow([now, id, name, team, score, t, discs, String(o.v || '')]);
      return json_(Object.assign({ ok: true, record: rec }, meOf_(id, team)));
    }
    return json_({ ok: false, err: 'action' });
  } finally { lock.releaseLock(); }
}

// compteurs d'un joueur (dernier état seulement : le jeu envoie ses totaux)
function saveStats_(o) {
  const id = String(o.id || '').slice(0, 40), payload = String(o.payload || '');
  if (!/^[a-z0-9]{6,40}$/.test(id) || payload.length > 20000) return { ok: false, err: 'bad' };
  if (o.sig !== cyrb53(id + '|' + payload + '|' + STATS_SECRET)) return { ok: false, err: 'sig' };
  let p; try { p = JSON.parse(payload); } catch (e) { return { ok: false, err: 'json' }; }
  const name = cleanName_(p.name), team = String(p.team || '');
  if (!name || TEAMS.indexOf(team) < 0) return { ok: false, err: 'bad' };
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = stats_(), v = sh.getDataRange().getValues();
    let row = 0; for (let i = 1; i < v.length; i++) if (v[i][0] === id) { row = i + 1; break; }
    const line = [id, name, team, payload, new Date()];
    if (row) sh.getRange(row, 1, 1, line.length).setValues([line]); else sh.appendRow(line);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

// page des stats : totaux par équipe, cimetière, hall of fame, classement individuel complet
function teamStats_() {
  const { rows } = readAll_(), teamOf = {}, best = {}, upd = {};
  // compteurs (cumulés sur l'appareil) : comptés pour l'équipe actuelle du joueur
  rows.forEach(r => { if (!upd[r.id] || r.updated > upd[r.id]) { upd[r.id] = r.updated; teamOf[r.id] = r.team; } best[r.id] = Math.max(best[r.id] || 0, +r.best || 0); });
  const v = stats_().getDataRange().getValues(), P = [];
  for (let i = 1; i < v.length; i++) {
    let p; try { p = JSON.parse(v[i][3]); } catch (e) { continue; }
    const id = v[i][0], team = teamOf[id] || v[i][2]; if (TEAMS.indexOf(team) < 0) continue;
    p.morts = Object.keys(p.deathBy || {}).reduce((s, k) => s + (+p.deathBy[k] || 0), 0);
    p.score = Math.max(best[id] || 0, +p.best || 0);
    P.push({ id, name: cleanName_(rows.find(r => r.id === id) ? rows.find(r => r.id === id).name : v[i][1]), team, p });
  }
  const blank = () => { const o = { players: 0, streak: 0, morts: 0 }; SUM.forEach(k => o[k] = 0); return o; };
  const totals = blank(), teams = {}, deathBy = {}, deathTh = {};
  TEAMS.forEach(t => teams[t] = blank());
  P.forEach(({ team, p }) => {
    for (const o of [totals, teams[team]]) {
      o.players++; SUM.forEach(k => o[k] += +p[k] || 0); o.streak = Math.max(o.streak, +p.streak || 0); o.morts += p.morts;
    }
    for (const k in p.deathBy || {}) deathBy[k] = (deathBy[k] || 0) + (+p.deathBy[k] || 0);
    for (const k in p.deathTh || {}) deathTh[k] = (deathTh[k] || 0) + (+p.deathTh[k] || 0);
  });
  const leaders = {};
  ['score', 'streak', 'discs', 'games', 'dist', 'ko', 'morts', 'missed', 'rb', 'giga', 'time'].forEach(k => {
    leaders[k] = P.filter(x => (+x.p[k] || 0) > 0).sort((a, b) => (+b.p[k] || 0) - (+a.p[k] || 0)).slice(0, 5).map(x => ({ name: x.name, team: x.team, v: +x.p[k] || 0 }));
  });
  const ranking = rows.filter(r => +r.best > 0).sort((a, b) => b.best - a.best)
    .map((r, i) => ({ rank: i + 1, name: r.name, team: r.team, score: +r.best, games: +r.games || 0 }));
  return { ok: true, players: P.length, totals, teams, deathBy, deathTh, leaders, ranking, updated: Date.now() };
}

function meOf_(id, team) { const res = results_(id, team); return { me: res.me, teams: res.teams, N: res.N }; }

// classement des équipes : moyenne des 3 meilleurs records (moins s'il y a moins de 3 joueurs)
function results_(id, team) {
  const { rows } = readAll_();
  const by = {}; TEAMS.forEach(t => by[t] = []);
  rows.forEach(r => { if (by[r.team] && +r.best > 0) by[r.team].push(r); });
  TEAMS.forEach(t => by[t].sort((a, b) => b.best - a.best));
  const N = TOP_N;
  const teams = TEAMS.map(t => {
    const p = by[t], top = p.slice(0, N);
    return {
      id: t, players: p.length,
      score: top.length ? Math.round(top.reduce((s, r) => s + (+r.best), 0) / top.length) : 0,
      games: rows.filter(r => r.team === t).reduce((s, r) => s + (+r.games || 0), 0),
      total: rows.filter(r => r.team === t).reduce((s, r) => s + (+r.total || 0), 0),
      top: top.map(r => ({ name: r.name, score: +r.best })),
      star: p[0] ? { name: p[0].name, score: +p[0].best } : null
    };
  }).sort((a, b) => b.score - a.score || b.players - a.players);
  // ex aequo : même rang
  teams.forEach(t => t.rank = t.players ? 1 + teams.filter(x => x.players && x.score > t.score).length : 0);
  const all = rows.filter(r => +r.best > 0).sort((a, b) => b.best - a.best);
  // « moi » : ma ligne dans mon équipe actuelle (sinon la plus récente)
  const mine = rows.filter(r => r.id === id && +r.best > 0), cur = mine.find(r => r.team === team) || mine.sort((a, b) => b.updated - a.updated)[0];
  const top10 = all.slice(0, 10).map((r, i) => ({ rank: i + 1, name: r.name, team: r.team, score: +r.best, me: r === cur }));
  let me = null;
  const k = cur ? all.indexOf(cur) : -1;
  if (k >= 0) me = { rank: k + 1, name: all[k].name, team: all[k].team, score: +all[k].best, games: +all[k].games };
  return { ok: true, N, teams, top10, me, players: all.length, games: rows.reduce((s, r) => s + (+r.games || 0), 0), at: Date.now() };
}

function doGet(e) {
  if (e && e.parameter && e.parameter.view === 'stats') return json_(teamStats_());
  const id = String((e && e.parameter && e.parameter.id) || '').slice(0, 40), team = String((e && e.parameter && e.parameter.team) || '');
  return json_(results_(id, team));
}

// À lancer une fois après la mise à jour (Apps Script : choisir « reconstruire » puis Exécuter) :
// refait l'onglet « Joueurs » à partir de l'onglet « Parties », une ligne par joueur et par équipe,
// pour rendre à chaque équipe les records faits sous ses couleurs (l'ancienne version les déplaçait).
// L'ancien onglet est gardé en copie (« Joueurs avant reconstruction »).
function reconstruire() {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet(), old = players_();
    const v = runs_().getDataRange().getValues(), by = {}, names = {};
    for (let i = 1; i < v.length; i++) {
      const [date, id, name, team, score, t, discs] = v[i];
      if (!id || TEAMS.indexOf(team) < 0) continue;
      const key = id + '|' + team, d = date instanceof Date ? date : new Date(date);
      const r = by[key] || (by[key] = { id, name, team, best: 0, bestT: 0, bestDiscs: 0, games: 0, total: 0, created: d, updated: d });
      r.games++; r.total += +score || 0; if (d > r.updated) r.updated = d; if (d < r.created) r.created = d;
      if ((+score || 0) > r.best) { r.best = +score; r.bestT = +t || 0; r.bestDiscs = +discs || 0; }
      names[id] = name;   // le dernier nom utilisé
    }
    const copy = ss.getSheetByName('Joueurs avant reconstruction'); if (copy) ss.deleteSheet(copy);
    old.copyTo(ss).setName('Joueurs avant reconstruction');
    old.clearContents(); old.appendRow(COLS);
    const out = Object.keys(by).map(k => { const r = by[k]; r.name = names[r.id] || r.name; return COLS.map(c => r[c]); });
    if (out.length) old.getRange(2, 1, out.length, COLS.length).setValues(out);
    Logger.log(out.length + ' lignes (joueur × équipe) reconstruites à partir de ' + (v.length - 1) + ' parties');
  } finally { lock.releaseLock(); }
}
