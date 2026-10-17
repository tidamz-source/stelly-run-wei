# Stelly Run · Édition équipes

Version de Stelly Run (Lutèce Games) où chaque partie compte pour une équipe : Bleue, Rouge, Jaune ou Verte.

- Au premier lancement, on choisit son équipe et on écrit son nom.
- Chaque partie est envoyée au classement des équipes. Le changement d'équipe ou de nom se fait dans Réglages, et le record suit le joueur.
- `equipes.html` : page des résultats (classement des équipes, top 10 des joueurs, actualisation toutes les 30 s). Elle est faite pour être projetée.

## Calcul du classement

On compare la **moyenne des 3 meilleurs records** de chaque équipe (`TOP_N` dans `backend/Code.gs`). Une équipe qui a moins de 3 joueurs : moyenne de ceux qu'elle a.

Une équipe de 10 et une équipe de 3 sont donc comparées sur le même nombre de joueurs. Le total des points et le nombre de parties sont affichés à part, comme stats d'effort.

## Fichiers

| Fichier | Rôle |
|---|---|
| `tools/make_wei.py` | Fabrique le jeu à partir du Stelly Run officiel |
| `tools/wei.js` | Module équipes : choix, nom, envoi des scores |
| `tools/equipes.src.html` | Modèle de la page des résultats |
| `tools/config.json` | Adresse du script du classement (`url`) et numéro de révision (`rev`) |
| `backend/Code.gs` | Script Google Apps Script du classement (Google Sheet) |

Les sauvegardes sont séparées de celles du jeu officiel (préfixe `stellyrunwei_`). Le transfert entre appareils et les stats mondiales sont désactivés.

## Brancher le classement (une seule fois)

1. Crée une Google Sheet vide, puis ouvre Extensions > Apps Script.
2. Colle le contenu de `backend/Code.gs` et enregistre.
3. Va dans Déployer > Nouveau déploiement > Application Web.
   - Exécuter en tant que : Moi.
   - Accès : Tout le monde.
4. Copie l'URL qui finit par `/exec` dans `tools/config.json` (`url`), puis relance la fabrication.

## Mettre à jour depuis le jeu officiel

```
python3 tools/make_wei.py ../stelly-run
```

Augmente aussi `rev` dans `tools/config.json` pour que le service worker se mette à jour.
