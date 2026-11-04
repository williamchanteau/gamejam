# ASHENBORN

Boss rush 2D en pixel art, dark fantasy / Halloween, fait pour une game jam.
On entre dans un château et on monte étage par étage. Chaque étage est une salle de boss.

> **Dépôt : jeudi 5 novembre, 7 h.** La consigne impose des **boss** : barre de vie nommée et salles de boss. Sinon, c'est la disqualification.

---

## Lancer le jeu

Prérequis : [Bun](https://bun.sh). Il sert de gestionnaire de paquets et lance les scripts ; Vite est appelé à travers lui.

```bash
curl -fsSL https://bun.sh/install | bash   # une seule fois
bun install                                # dépendances (Phaser, Vite, TypeScript)
```

| Commande | Effet |
|---|---|
| `bun run dev` | Serveur de dev avec rechargement à chaud → http://localhost:5173 |
| `bun run check` | Vérification des types TypeScript (`tsc --noEmit`) |
| `bun run build` | Build de rendu → `dist/index.html` (s'ouvre en double-clic, `file://`, sans serveur) |
| `bun run zip` | Build + archive `jeu-web.zip` (contient **uniquement** `dist/`) : c'est le fichier à déposer |

Avant chaque commit, lancer `bun run build` puis `bun run check`.

### Raccourcis de développement (uniquement en `bun run dev`)

| Raccourci | Effet |
|---|---|
| `F1` | Le boss passe à 1 PV |
| `F2` | Joueur invincible |
| `http://localhost:5173/#Boss1` | Démarre directement sur la scène indiquée (`#Boss1`, `#Test`, `#Outside`, `#Menu`) |
| `window.game` | Instance Phaser exposée dans la console, par exemple `game.scene.getScene('Boss1').boss.hp = 10` |

---

## Contrôles

| Action | Touche (AZERTY) | Touche (QWERTY) |
|---|---|---|
| Bouger | ← → | ← → |
| Sauter | ↑ ou Espace | ↑ ou Espace |
| Descendre d'une plateforme | ↓ | ↓ |
| Attaque (combo 3 coups) | A | Q |
| Dash (esquive invincible) | Z | W |
| Sort « Éclat lunaire » (mana pleine) | E | E |
| Pause | Échap ou P | Échap ou P |
| Menus | ↑↓ + Entrée/Espace, ou souris | idem |

Les touches sont lues par **position physique** (`e.code`). L'option **CLAVIER** (menu titre ou pause) ne change que les lettres affichées à l'écran. Il n'y a pas de manette.

---

## Contraintes de rendu (non négociables)

- **Hors ligne :** aucun appel réseau. Le build est un script classique, avec des chemins relatifs, et doit marcher en `file://`.
- **Anonymat total dans le jeu et dans le zip :** aucun nom, crédit, lien ou auteur. Pas de sourcemaps, pas de chemin utilisateur. Ne jamais mettre ce README (ni rien d'autre que `dist/`) dans le zip.
- **Aucune ressource externe :** pas de fichier image ni de son. Toutes les textures sont générées par code (canvas) et les bruitages sont faits en WebAudio.
- **Textes :** en français, en MAJUSCULES, avec la police bitmap maison. Ne citer aucun autre jeu.
- **Côté jurés :**
  - on doit passer du titre au combat en moins de 15 s ;
  - les contrôles sont affichés à l'écran ;
  - une partie dure environ 5 min ;
  - la difficulté reste clémente ;
  - le jeu tient 60 fps sur un PC modeste.
- **Rendu :** 480×270 agrandi en plein écran (×4 en 1080p), en pixel art.

---

## Stack et structure

Bun + **Phaser 3.90** (physique Arcade) + TypeScript + Vite 6.

```
src/
  config.ts        toutes les valeurs réglables (joueur, boss, arène, couleurs)
  input.ts         clavier (touches physiques), option AZERTY/QWERTY, plein écran
  floors.ts        liste des étages (scène + nom affiché)
  main.ts          configuration Phaser + liste des scènes
  scenes/
    BootScene      génère toutes les textures puis lance le menu
    MenuScene      écran titre (JOUER / TUTO / OPTIONS / QUITTER)
    OutsideScene   devant le château, on marche jusqu'à la porte
    ArenaScene     base commune : sol, plateformes, joueur, HUD, hit-stop, sorts
    BossScene      salle de boss : annonceur, barre nommée, victoire → escalier
    TestScene      tuto (salle d'entraînement + épouvantail + panneaux)
    TransitScene   écran « ÉTAGE N » entre deux boss / fin provisoire
    PauseScene     pause (reprendre / recommencer / options / menu)
    GameOverScene  GAME OVER (dernière sauvegarde / accueil)
    rooms.ts       décor animé de la nef (parallaxe, torches, chauves-souris)
  entities/
    Player.ts      déplacement, saut, dash, combo, mana, sort
    Boss.ts        boss générique piloté par données (patterns en coroutines)
  bosses/
    ysolde.ts      boss 1 : graphismes, poses, patterns
    nycthor.ts     boss 2 : poses, patterns (lanterns.ts : lanternes, obscurité)
  art/             textures générées par code (joueur, nef, extérieur, titre, police)
  ui/              HUD, barre du boss, annonceur, menus, options
  audio/sfx.ts     bruitages synthétisés
```

### Ajouter un boss

1. Créer `src/bosses/<nom>.ts`, qui exporte un `BossDef` : nom, titre, PV, `build`, `rest`, liste de `patterns`. Chaque pattern est un générateur qui fait `yield` d'une durée en secondes.
2. Créer la scène de salle : une sous-classe de `BossScene` avec la bonne `def` et le bon décor. L'enregistrer dans `main.ts`.
3. Ajouter l'étage dans `src/floors.ts`.

### Règles de conception du boss

- Chaque attaque suit le cycle **télégraphe → actif → récupération**. Pendant la récupération, le boss est ouvert et ses yeux sont éteints.
- Durée minimale du télégraphe : 0,6 s en phase 1, 0,45 s en phase 2.
- **Rouge/magenta = danger uniquement.** La seule exception, voulue, est le titre GAME OVER.
- À 50 % PV :
  - le boss rugit, avec 1 s d'invulnérabilité ;
  - il débloque de nouveaux patterns et va 15 % plus vite ;
  - la barre brille en or puis se recharge : la moitié de PV restante remplit toute la barre.

---

## Fonctionnalités actuelles

**Parcours**
- Menu titre → extérieur du château → porte → **Boss 1** dans la nef.
- Victoire → la grille se lève → escalier → écran « ÉTAGE 1 » → fin provisoire.

**Joueur**
- Contrôle vif : saut variable, coyote time et buffer de 0,1 s.
- Dash = esquive invincible (~0,22 s), avec un dash aérien.
- Combo 3 coups. Chaque coup touché donne +1 mana. Mana pleine → sort « Éclat lunaire » (croissant perforant).
- 3 PV, recul et hit-stop quand on est touché.

**Boss 1 – Ysolde, la Dame d'Argent (200 PV)**

| Phase | Attaques |
|---|---|
| Phase 1 | Taille en ruée ; saut écrasant (repère au sol + onde de pics à sauter) ; 2 lames spectrales rasantes |
| Phase 2 | Enchaînement 3 coups ; double onde |

Animations : corps articulé, traînées d'épée, débris, poussière, flash, secousses.

**Mise en scène**
- Annonceur de boss (~2,3 s, rejoué après une mort).
- Barre de vie nommée en bas de l'écran.
- Caméra cadrée sur le joueur et le boss, dans une arène de 2 écrans.

**Décor de la nef**
- Voûte, mur à travées avec vitraux et rosace, piliers au premier plan.
- Parallaxe, torches, bougies, citrouilles, chauves-souris, poussière.
- Mur de fond avec la porte de l'escalier.

**Menus**
- Menu titre : boutons encadrés à gauche, scène animée à droite.
- Pause (dont OPTIONS) et options clavier AZERTY/QWERTY (mémorisées).
- Écran GAME OVER : dernière sauvegarde (la salle, intro rejouée) ou retour à l'accueil.

**Tuto**
- Salle d'entraînement avec un épouvantail qui tire des orbes.
- Panneaux placés en contexte : au sol, au-dessus des plateformes, suspendu au plafond.

**Divers**
- Plein écran au premier appui ou clic ; si on sort du plein écran en jeu, le jeu se met en pause.

---

## À changer / connu

| Sujet | État | Piste |
|---|---|---|
| **Château vu de dehors** | Ressemble à une grosse tour, pas assez « château dark fantasy » | Silhouette large : courtines, plusieurs tours, donjon, porte fortifiée |
| **Lames spectrales du boss** | Animation jugée pas assez propre | Nouvelle forme et apparition, qui doit rester **basse** (on la saute) |
| **Rappel des contrôles en combat** | Affiché en haut à droite (masqué dans le tuto) | À garder ou non partout, le règlement demande les contrôles à l'écran |
| **Touche R** | Libre | Lui donner une action ? |
| **Attaque à « 1 coup de moins »** | Appliquée aux lames spectrales (3 → 2) | À confirmer : ou bien l'enchaînement 3 coups de la phase 2 ? |
| **Barre du boss à 50 %** | Implémentée (or 3 s puis recharge, moitié restante = barre pleine) | À valider en playtest |
| **Son** | Uniquement des bruitages | Ambiance musicale à faire |

---

## Feuille de route

On avance une étape à la fois. À chaque étape : `bun run build` + `bun run check`, un commit, puis un playtest avant de continuer.

- [x] **0** Setup (Bun, Phaser, Vite, build `file://`)
- [x] **1** Salle de test, joueur, HUD
- [x] **1b** Rendu 480×270, art détaillé, menu titre, pause, tuto
- [x] **2** Boss générique + Ysolde + nef en parallaxe + barre nommée + intro/victoire
- [x] **2c** Plein écran, arène ×2, animations lourdes, annonceur, château/escalier
- [x] **2d** Contrôles flèches + A/Z/E, option clavier, écran de mort, panneaux du tuto
- [x] **2e** GAME OVER, options en pause, barre à 50 %, pics propres, nef cohérente, nouveau menu titre
- [ ] **2f** Château extérieur refait + lames spectrales plus propres
- [x] **3** Boss 2 « Nycthor, le Porteur de Lanternes » (260 PV), à l'étage 1 :
  - la Crypte des Lanternes, salle plongée dans l'obscurité ;
  - patterns : rush, ombre, lancer ;
  - phase 2 : moulinet, épreuve des 3 lanternes.
- [ ] **Victoire finale**
- [ ] **Plus tard**
  - options supplémentaires (à discuter) ;
  - musique / son d'ambiance ;
  - polish, équilibrage ;
  - **build final + `jeu-web.zip`** avant jeudi 7 h.

---

## Conventions

- Toutes les valeurs de gameplay sont dans `src/config.ts`, et les valeurs propres à un boss dans son fichier `bosses/`.
- `scene.restart()` ne relance pas les initialiseurs de champs : tout réinitialiser dans `create()`.
- Les objets à l'écran (HUD, menus) utilisent `setScrollFactor(0)`.
- Appeler `input.reset()` à chaque ouverture ou fermeture de menu.
- Palette :
  - cyan lune = joueur et sorts ;
  - rouge/magenta = danger ;
  - orange braise = ambiance ;
  - fond `#0b0a14` / `#1a1630`.
- `CLAUDE.md` contient les règles détaillées du projet.
