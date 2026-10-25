#!/usr/bin/env python3
"""Fabrique l'édition équipes de Stelly Run à partir du jeu officiel.

Usage, depuis la racine de ce dépôt :
    python3 tools/make_wei.py /chemin/vers/stelly-run

- copie le jeu officiel (index.html, langues.js, stelly.js, json, icônes)
- sauvegardes séparées du jeu officiel (préfixe stellyrunwei_ : les deux jeux sont sur le même domaine github.io)
- classement des équipes à la place du classement mondial (tools/wei.js, backend/Code.gs)
- transfert entre appareils et stats mondiales désactivés (ils parlent au serveur du jeu officiel)
- equipes.html est fabriqué depuis tools/equipes.src.html ; backend/Code.gs est le script du classement (Google Apps Script)
Pour récupérer une mise à jour du jeu officiel : relancer ce script, puis WEI_REV + 1 dans tools/config.json.
"""
import json, pathlib, re, shutil, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
if len(sys.argv) < 2: sys.exit(__doc__)
SRC = pathlib.Path(sys.argv[1]).resolve()
CFG = json.loads((HERE / 'config.json').read_text(encoding='utf-8'))

def once(s, old, new, label):
    n = s.count(old)
    if n != 1: sys.exit(f'[wei] « {label} » : {n} occurrence(s) au lieu de 1')
    return s.replace(old, new)

# ---------- index.html ----------
idx = (SRC / 'index.html').read_text(encoding='utf-8')
APP = re.search(r"const APP_VERSION = '([^']+)'", idx).group(1)
idx = idx.replace("'stellyrun_", "'stellyrunwei_")
idx = re.sub(r"const LB_URL = '[^']*';",
  "// classement des équipes (backend/Code.gs) ; le serveur du jeu officiel n'est jamais appelé\n"
  "const WEI_URL = " + json.dumps(CFG['url']) + ";\nconst WEI_REV = '" + APP + "-" + str(CFG['rev']) + "';\nconst WEI_SECRET = 'wei-st3lly-4q8z';\nconst LB_URL = WEI_URL;", idx, count=1)
if 'const WEI_URL' not in idx: sys.exit('[wei] LB_URL introuvable')
P = [
  ('<title>Stelly Run</title>', '<title>Stelly Run · Équipes</title>', 'titre'),
  ('<meta name="apple-mobile-web-app-title" content="Stelly Run">', '<meta name="apple-mobile-web-app-title" content="Stelly Équipes">', 'titre ios'),
  # stats : envoyées au script des équipes, avec le nom et l'équipe du joueur (page stats.html)
  ("const d = TR.d, st = d.st, n = store('stellyrunwei_name');\n    return JSON.stringify(statsArchive({ name: n || '',",
   "const d = TR.d, st = d.st, wt = WEI.team();\n    return JSON.stringify(statsArchive({ name: WEI.name(), team: wt ? wt.id : '',", 'stats avec équipe'),
  # trophées : le jeu officiel n'affiche plus de message en pleine partie depuis la v7.2 (rien à faire ici)
  # défis du jour : pas dans cette édition (bouton masqué dans tools/wei.js, plus de progression ni de récompense)
  ('  function check(){\n    roll(); if (R.active) countHigh();', '  function check(){ return;\n    roll(); if (R.active) countHigh();', 'défis du jour coupés'),
  # chaque partie est envoyée au classement des équipes (plus de saisie de 3 lettres)
  ('if (score > (TR.d.lbBest || 0) && !AC.sus()) lbEntry.show(score, t, discCount); else lbEntry.hide();',
   'lbEntry.hide(); if (!AC.sus()) WEI.send(score, t, discCount);', 'envoi des scores'),
  # bouton du classement : page des résultats des équipes
  ("$('lbbtn').addEventListener('click', e => { e.stopPropagation(); ensureAudio(); open(); });",
   "$('lbbtn').addEventListener('click', e => { e.stopPropagation(); ensureAudio(); WEI.results(); });", 'bouton résultats'),
  # pas de partie sans équipe
  ('function startGame(){\n  if (tutoUI.need()){', 'function startGame(){\n  if (WEI.need()){ WEI.open(); return; }\n  if (tutoUI.need()){', 'équipe avant de jouer'),
  ("localStorage.setItem('stellyrunwei_lang', l); } catch(e){} applyLang(); }", "localStorage.setItem('stellyrunwei_lang', l); } catch(e){} applyLang(); try { WEI.paint(); } catch(e){} }", 'langue'),
  # pas d'Armure d'adamantium (elle changerait la couleur de Stelly)
  ('function addTrophyItems(){\n', 'function addTrophyItems(){ return;\n', 'armure retirée'),
  # module équipes : tout à la fin, après les autres modules (il s'en sert)
  ("\n// le jeu est prêt : barre pleine", (HERE / 'wei.js').read_text(encoding='utf-8') + "\n// le jeu est prêt : barre pleine", 'module équipes'),
]
for o, n, l in P: idx = once(idx, o, n, l)

# ---------- langues.js ----------
lng = (SRC / 'langues.js').read_text(encoding='utf-8')
WT = '''  // édition équipes
  "wei.pick":     { fr:"Choisis ton équipe", en:"Pick your team", es:"Elige tu equipo" },
  "wei.name":     { fr:"Ton nom", en:"Your name", es:"Tu nombre" },
  "wei.go":       { fr:"C’est parti !", en:"Let’s go!", es:"¡Vamos!" },
  "wei.ok":       { fr:"Valider", en:"Confirm", es:"Confirmar" },
  "wei.needTeam": { fr:"Choisis une équipe", en:"Pick a team", es:"Elige un equipo" },
  "wei.needName": { fr:"Écris ton nom", en:"Write your name", es:"Escribe tu nombre" },
  "wei.move":     { fr:"Ton record reste à ton ancienne équipe : tu repars de zéro dans la nouvelle.", en:"Your best score stays with your old team: you start from zero in the new one.", es:"Tu récord se queda en tu antiguo equipo: empiezas de cero en el nuevo." },
  "wei.t.bleu":   { fr:"Bleue", en:"Blue", es:"Azul" },
  "wei.t.rouge":  { fr:"Rouge", en:"Red", es:"Roja" },
  "wei.t.jaune":  { fr:"Jaune", en:"Yellow", es:"Amarilla" },
  "wei.t.vert":   { fr:"Verte", en:"Green", es:"Verde" },
  "wei.team":     { fr:"Équipe {t}", en:"Team {t}", es:"Equipo {t}" },
  "wei.mine":     { fr:"Mon équipe", en:"My team", es:"Mi equipo" },
  "wei.change":   { fr:"Changer", en:"Change", es:"Cambiar" },
  "wei.edition":  { fr:"équipes", en:"teams", es:"equipos" },
  "wei.results":  { fr:"Résultats des équipes", en:"Team results", es:"Resultados de los equipos" },
  "wei.sent":     { fr:"Score envoyé pour l’équipe {t}", en:"Score sent for team {t}", es:"Puntuación enviada para el equipo {t}" },
  "wei.record":   { fr:"Record perso ! Envoyé pour l’équipe {t}", en:"Personal best! Sent for team {t}", es:"¡Récord personal! Enviado para el equipo {t}" },
  "wei.rank":     { fr:"ton équipe est {n}e", en:"your team is #{n}", es:"tu equipo va {n}.º" },
  "wei.sub":      { fr:"Chaque partie compte pour ta couleur", en:"Every run counts for your colour", es:"Cada partida cuenta para tu color" },
  "wei.players":  { fr:"{n} joueurs", en:"{n} players", es:"{n} jugadores" },
  "wei.player":   { fr:"{n} joueur", en:"{n} player", es:"{n} jugador" },
  "wei.later":    { fr:"Hors connexion : ton score partira plus tard", en:"Offline: your score will be sent later", es:"Sin conexión: tu puntuación se enviará más tarde" },
'''
lng = once(lng, '\n};\n\n/* Nouvelles du jeu', '\n' + WT.rstrip('\n') + '\n};\n\n/* Nouvelles du jeu', 'textes équipes')
lng = re.sub(r"  \{ id:'2026-10-09-synchro'.*?(?=\n  \{ id:)", '', lng, count=1, flags=re.S)   # transfert entre appareils : pas dans cette édition
if "2026-10-09-synchro" in lng: sys.exit('[wei] news synchro non retirée')
NEWS = '''  { id:'wei-bienvenue', date:'2026-10-17', icon:'trophee',
    title:{ fr:'Bienvenue dans l’édition équipes', en:'Welcome to the team edition', es:'Bienvenido a la edición por equipos' },
    text:{ fr:'Chaque partie compte pour ton équipe. Pour que ce soit juste entre une grande et une petite équipe, on compare la moyenne des 3 meilleurs records de chaque équipe. Les résultats sont sur le bouton du classement.',
      en:'Every run counts for your team. To keep it fair between big and small teams, we compare the average of the top 3 scores of each team. Results are behind the ranking button.',
      es:'Cada partida cuenta para tu equipo. Para que sea justo entre equipos grandes y pequeños, se compara la media de los 3 mejores récords de cada equipo. Los resultados están en el botón de la clasificación.' } },
'''
lng = once(lng, "const NEWS = [\n", "const NEWS = [\n" + NEWS, 'news bienvenue')

# ---------- service worker et manifeste ----------
sw = (SRC / 'sw.js').read_text(encoding='utf-8')
sw = re.sub(r"const VERSION = '[^']*';", f"const VERSION = 'stelly-run-wei-{APP}-{CFG['rev']}';", sw, count=1)
# même domaine que le jeu officiel : on ne supprime que nos propres caches
sw = once(sw, "keys.filter(k => k !== VERSION)", "keys.filter(k => k.startsWith('stelly-run-wei-') && k !== VERSION)", 'sw : caches')
sw = once(sw, "  './index.html',\n", "  './index.html',\n  './equipes.html',\n  './stats.html',\n", 'sw : equipes.html')
man = json.loads((SRC / 'manifest.webmanifest').read_text(encoding='utf-8'))
man.update({ 'name': 'Stelly Run · Équipes', 'short_name': 'Stelly Équipes', 'description': 'Stelly Run, édition équipes : chaque partie compte pour ton équipe !' })

# ---------- garde-fous ----------
if 'AKfycbwJCiKyJ7zyoGK7BEGem0crHldaZgvWSWcj6KE' in idx: sys.exit('[wei] l\'URL du classement du jeu officiel est restée dans index.html')
if re.search(r"'stellyrun_", idx): sys.exit('[wei] clé de sauvegarde du jeu officiel restée')
if shutil.which('node'):
    for name, code in [('index.html', max(re.findall(r'<script>(.*?)</script>', idx, re.S), key=len)), ('langues.js', lng)]:
        with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as f: f.write(code)
        r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True)
        if r.returncode: sys.exit(f'[wei] ERREUR DE SYNTAXE dans {name} :\n' + r.stderr[:600])

# ---------- écriture ----------
(ROOT / 'index.html').write_text(idx, encoding='utf-8')
(ROOT / 'langues.js').write_text(lng, encoding='utf-8')
(ROOT / 'sw.js').write_text(sw, encoding='utf-8')
(ROOT / 'manifest.webmanifest').write_text(json.dumps(man, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
# page des résultats : polices du jeu + adresse du serveur
fonts = '\n'.join(l for l in idx.split('\n') if l.startswith('@font-face'))
eq = (HERE / 'equipes.src.html').read_text(encoding='utf-8')
eq = once(eq, '/*FONTS*/', fonts, 'polices').replace("/*URL*/''", json.dumps(CFG['url']))
(ROOT / 'equipes.html').write_text(eq, encoding='utf-8')
st = (HERE / 'stats.src.html').read_text(encoding='utf-8')
st = once(st, '/*FONTS*/', fonts, 'polices stats').replace("/*URL*/''", json.dumps(CFG['url']))
(ROOT / 'stats.html').write_text(st, encoding='utf-8')
for f in ['stelly.js', 'trophees.json', 'obstacles.json']: shutil.copy(SRC / f, ROOT / f)
# boutique : sans les costumes qui changent la couleur de Stelly (elle porte la couleur de son équipe)
NO_SHIRTS = {'shirt-bleu', 'shirt-vert', 'shirt-violet', 'shirt-collector', 'shirt-adamantium'}
bq = json.loads((SRC / 'boutique.json').read_text(encoding='utf-8')); bq['items'] = [it for it in bq['items'] if it['id'] not in NO_SHIRTS]
(ROOT / 'boutique.json').write_text(json.dumps(bq, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
shutil.copytree(SRC / 'icons', ROOT / 'icons', dirs_exist_ok=True)
print(f'[wei] édition équipes fabriquée depuis Stelly Run v{APP} (rev {CFG["rev"]}) · serveur : {CFG["url"] or "PAS ENCORE BRANCHÉ"}')
