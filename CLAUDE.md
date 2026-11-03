# ASHENBORN — jeu de jam (Oddward), boss rush dark fantasy / Halloween
Dépôt avant jeudi 5 nov. 7h. Consigne : BOSS obligatoires, focus combats de boss (barre de vie nommée, salles de boss). Sinon disqualifié.

## Règles de travail
- Seul dev = Claude ; l'utilisateur playteste. Une ÉTAPE à la fois, STOP après chaque étape, commit git après chaque étape.
- Budget tokens serré : réponses courtes, petits fichiers, pas de refactor, pas de tests/linters/docs, ne pas relire tout le repo.
- Avant de rendre une étape : `bun run build` + `bun run check` (Bun = gestionnaire de paquets + runtime des scripts, Vite = bundler ; `bun run dev` pour jouer en local).

## Rendu (non négociable)
- `bun run build` → dist/index.html, chemins relatifs, script classique (pas de module, defer) → marche en file://. `bun run zip` → jeu-web.zip.
- Aucun appel réseau. Anonymat total : aucun nom/crédit/lien/auteur, pas de sourcemaps, pas de chemin utilisateur. `banner: false`.
- Jurés : titre → combat < 15 s, contrôles affichés à l'écran, retry après mort ≤ 1 s (le retry SAUTE l'intro de 2 s), partie ≈ 5 min, difficulté clémente.
- Textes en français (police bitmap maison, MAJUSCULES). Ne citer aucun autre jeu. 60 fps PC modeste.

## Stack
Bun + Phaser 3.90 + TS + Vite 6, Arcade. 480×270 (distances ×1,5 vs 320×180 d'origine), zoom entier, pixelArt, roundPixels. Sol floorY 234, plateformes 84 px à y 177 (x 108/372). Joueur sprite 24×36, hitbox 12×27. Aucun fichier image/son : textures générées par code, SFX WebAudio.
src/: config.ts (TOUTES les valeurs réglables), input.ts, scenes/, entities/Player.ts, entities/Boss.ts, patterns/, bosses/ (1 fichier de données par boss), art/, audio/sfx.ts, ui/.
`scene.restart()` ne relance pas les initialiseurs de champs : tout réinitialiser dans create().

## Contrôles (AZERTY, via e.key)
Q/D ou ←/→ · Saut Z/↑/Espace · Descendre d'une plateforme S/↓ · Attaque J/W · Dash K/X · Sort L/C · Pause Échap. Menus : ↑↓/Z/S, valider Entrée/Espace/J, souris. Une touche peut porter plusieurs actions (input.ts) → `input.reset()` à chaque ouverture/fermeture de menu. Pas de manette.
DEV seulement : F1 boss à 1 PV, F2 invincible, URL `#Boss1`/`#Test` = démarrage direct sur la scène, `window.game` exposé (gate `import.meta.env.DEV`).
Test visuel : chrome-headless-shell de ~/.cache/ms-playwright + libs nspr/nss/asound extraites localement (apt-get download + dpkg -x, LD_LIBRARY_PATH), piloté via CDP (WebSocket Node) sur `bun run dev`.

## Joueur
Vif, saut variable, coyote 0,1 s, buffer 0,1 s, double saut via flag (off). Dash = esquive : i-frames tout le dash (~0,22 s), ~84 px, cd ~0,55 s, direction tenue sinon face, 1 dash aérien rechargé au sol, images rémanentes. Combo 3 coups, +1 mana par coup touché. Mana pleine → "Éclat lunaire" (croissant perforant). 5 PV, invu 1,2 s, recul, hit-stop 70 ms.

## Boss (data-driven)
Boss générique unique. Pattern = télégraphe → actif → récupération (boss ouvert, yeux éteints). Télégraphe ≥ 0,6 s (P1) / ≥ 0,45 s (P2), couleur danger. Sélection pondérée, jamais 3× le même, pause ≥ 0,4 s. À 50 % PV : 1 s invu + rugissement + tremblement, nouveaux patterns, vitesse ×1,15. Barre de vie nommée EN BAS. Arène 1 écran : sol + 2 plateformes traversables. Intro 2 s (nom).
- Boss 1 « Mordrec, le Chevalier Creux » (~80 PV) : taille en arc (dash), saut écrasant + repère au sol + onde rasante (sauter), 3 lames spectrales rasantes. P2 : enchaînement 3 coups rythme varié, onde double.
- Boss 2 « Corvina, la Veuve aux Corbeaux » (~100 PV, flotte) : éventail 5 plumes, colonnes d'ombre (3 marques 0,8 s), disparition → réapparition sur un bord + faux en arc. P2 : 3 orbes en orbite puis tirés, colonnes en vague alternée, feinte (+0,4 s).

## DA
Hi-bit, contour 1 px joueur/boss. Cyan lune = joueur/sorts. Rouge/magenta = DANGER uniquement (jamais PV/HUD/déco). Orange braise = ambiance. Fond #0b0a14 / #1a1630, pierre gris-bleu. Parallaxe 4 couches, torches (halo additif), citrouilles, bougies, chauves-souris, toiles, poussière, vignette. Salle 1 nef vitraux bleus ; salle 2 vitraux pourpres + rosace. HUD + contrôles EN HAUT.
Boss grands (⅓–½ écran), pièces séparées animées par tweens, yeux lumineux. Juice : hit-stop, shake léger, particules, flash blanc.

## Étapes
0 setup ✔ · 1 salle de test + joueur + HUD ✔ · 1b 480×270 + art détaillé + menu titre (JOUER/TUTO/OPTIONS stub/QUITTER) + pause (reprendre/recommencer/menu) + tuto = salle de test avec panneaux ✔ (JOUER → salle de test en attendant l'étape 2 : à rebrancher sur l'arène 1) · 2 Boss générique (coroutines, entities/Boss.ts) + Mordrec (bosses/mordrec.ts) + nef parallaxe 4 couches (art/nave.ts, scenes/rooms.ts) + barre nommée + intro/retry/victoire ✔ (victoire → menu en attendant l'étape 3) · 3 Corvina + salle 2 + escalier/fondu + victoire · plus tard : options (à discuter avec l'utilisateur), son d'ambiance, polish, build final.
