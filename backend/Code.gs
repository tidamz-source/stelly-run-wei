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
 * Classement : moyenne des N meilleurs records de chaque équipe, N = nombre de joueurs de la plus petite équipe (MIN_N au minimum).
 * Une équipe qui a moins de N joueurs compte 0 pour chaque place vide.
 * Le record d'un joueur le suit s'il change d'équipe.
 */
const SECRET = 'wei-st3lly-4q8z';   // même clé que dans index.html (WEI_SECRET)
const TEAMS = ['bleu', 'rouge', 'jaune', 'vert'];
const MIN_N = 3;   // évite qu'une équipe d'un seul joueur ramène le classement au meilleur joueur de chaque équipe
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
  const id = String(o.id || '').slice(0, 40), name = cleanName_(o.name), team = String(o.team || '');
  if (!/^[a-z0-9]{6,40}$/.test(id) || !name || TEAMS.indexOf(team) < 0) return json_({ ok: false, err: 'bad' });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const { sh, rows } = readAll_(), now = new Date();
    let r = rows.find(x => x.id === id);
    if (o.action === 'profile') {
      // changement d'équipe ou de nom : le record suit le joueur
      if (o.sig !== cyrb53([id, name, team].join('|') + '|' + SECRET)) return json_({ ok: false, err: 'sig' });
      if (r) { r.name = name; r.team = team; r.updated = now; writeRow_(sh, r); }
      return json_({ ok: true });
    }
    if (o.action === 'score') {
      const score = Math.floor(+o.score), t = Math.round(+o.t || 0), discs = Math.floor(+o.discs || 0), rid = String(o.rid || '').slice(0, 40);
      if (o.sig !== cyrb53([id, name, team, score, t, discs, rid].join('|') + '|' + SECRET)) return json_({ ok: false, err: 'sig' });
      if (!isFinite(score) || score < 0 || score > 50000000) return json_({ ok: false, err: 'score' });
      // une même partie renvoyée deux fois (réseau coupé) n'est comptée qu'une fois
      const cache = CacheService.getScriptCache();
      if (rid && cache.get('r' + rid)) return json_(Object.assign({ ok: true, dup: true }, meOf_(id)));
      if (rid) cache.put('r' + rid, '1', 21600);
      if (!r) { r = { id, name, team, best: 0, bestT: 0, bestDiscs: 0, games: 0, total: 0, created: now, updated: now, row: sh.getLastRow() + 1 }; }
      r.name = name; r.team = team; r.games = (+r.games || 0) + 1; r.total = (+r.total || 0) + score; r.updated = now;
      const rec = score > (+r.best || 0);
      if (rec) { r.best = score; r.bestT = t; r.bestDiscs = discs; }
      writeRow_(sh, r);
      runs_().appendRow([now, id, name, team, score, t, discs, String(o.v || '')]);
      return json_(Object.assign({ ok: true, record: rec }, meOf_(id)));
    }
    return json_({ ok: false, err: 'action' });
  } finally { lock.releaseLock(); }
}

function meOf_(id) { const res = results_(id); return { me: res.me, teams: res.teams, N: res.N }; }

// classement des équipes : moyenne des N meilleurs records, N = taille de la plus petite équipe qui a des joueurs
function results_(id) {
  const { rows } = readAll_();
  const by = {}; TEAMS.forEach(t => by[t] = []);
  rows.forEach(r => { if (by[r.team] && +r.best > 0) by[r.team].push(r); });
  TEAMS.forEach(t => by[t].sort((a, b) => b.best - a.best));
  const sizes = TEAMS.map(t => by[t].length).filter(n => n > 0);
  const N = sizes.length ? Math.max(MIN_N, Math.min.apply(null, sizes)) : 0;
  const teams = TEAMS.map(t => {
    const p = by[t], top = p.slice(0, N);
    return {
      id: t, players: p.length,
      score: top.length ? Math.round(top.reduce((s, r) => s + (+r.best), 0) / N) : 0,   // places vides = 0
      games: rows.filter(r => r.team === t).reduce((s, r) => s + (+r.games || 0), 0),
      total: rows.filter(r => r.team === t).reduce((s, r) => s + (+r.total || 0), 0),
      top: top.map(r => ({ name: r.name, score: +r.best })),
      star: p[0] ? { name: p[0].name, score: +p[0].best } : null
    };
  }).sort((a, b) => b.score - a.score || b.players - a.players);
  // ex aequo : même rang
  teams.forEach(t => t.rank = t.players ? 1 + teams.filter(x => x.players && x.score > t.score).length : 0);
  const all = rows.filter(r => +r.best > 0).sort((a, b) => b.best - a.best);
  const top10 = all.slice(0, 10).map((r, i) => ({ rank: i + 1, name: r.name, team: r.team, score: +r.best, me: r.id === id }));
  let me = null;
  const k = all.findIndex(r => r.id === id);
  if (k >= 0) me = { rank: k + 1, name: all[k].name, team: all[k].team, score: +all[k].best, games: +all[k].games };
  return { ok: true, N, teams, top10, me, players: all.length, games: rows.reduce((s, r) => s + (+r.games || 0), 0), at: Date.now() };
}

function doGet(e) {
  const id = String((e && e.parameter && e.parameter.id) || '').slice(0, 40);
  return json_(results_(id));
}
