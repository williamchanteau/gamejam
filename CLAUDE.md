# ASHENBORN — jeu de jam (Oddward), boss rush dark fantasy / Halloween
Dépôt avant jeudi 5 nov. 7h. Consigne : BOSS obligatoires, focus combats de boss (barre de vie nommée, salles de boss). Sinon disqualifié.

## Règles de travail
- Seul dev = Claude ; l'utilisateur playteste. Une ÉTAPE à la fois, STOP après chaque étape, commit git après chaque étape.
- Budget tokens serré : réponses courtes, petits fichiers, pas de refactor, pas de tests/linters/docs, ne pas relire tout le repo.
- Avant de rendre une étape : `bun run build` + `bun run check` (Bun = gestionnaire de paquets + runtime des scripts, Vite = bundler ; `bun run dev` pour jouer en local).

## Rendu (non négociable)
- `bun run build` → dist/index.html, chemins relatifs, script classique (pas de module, defer) → marche en file://. `bun run zip` → jeu-web.zip.
- Aucun appel réseau. Anonymat total : aucun nom/crédit/lien/auteur, pas de sourcemaps, pas de chemin utilisateur. `banner: false`.
- Jurés : titre → combat < 15 s, contrôles affichés à l'écran, mort → écran « GAME OVER » en rouge (scenes/GameOverScene.ts ; rouge = exception voulue par l'utilisateur à la règle DA, ne pas changer) : DERNIÈRE SAUVEGARDE (floors.ts saveOf) = boss 1 → dehors (OutsideScene, pour pouvoir faire le tuto), boss suivants → la salle rejouée AVEC l'annonceur ; en DIFFICILE toute mort en boss → dehors (RECOMMENCER) ; ou REVENIR À L'ACCUEIL ; pause > RECOMMENCER saute l'intro, partie ≈ 5 min, difficulté clémente.
- Textes en français (police bitmap maison, MAJUSCULES). Ne citer aucun autre jeu. 60 fps PC modeste.

## Stack
Bun + Phaser 3.90 + TS + Vite 6, Arcade. Rendu 480×270 (distances ×1,5 vs 320×180 d'origine) agrandi en Scale.FIT (×4 en 1920×1080), plein écran demandé au 1er appui/clic et à chaque validation de menu ; sortie du plein écran en jeu → pause. pixelArt, roundPixels. Sol floorY 234. Salle de test 1 écran (plateformes x 108/372). Arène de boss 960 px (ARENA.bossW, 4 plateformes), caméra cadrée joueur/boss (BossScene.camTarget), parallaxe par container.setScrollFactor (art/nave.ts NAVE_F, layerW). Objets écran = setScrollFactor(0). Joueur sprite 24×36, hitbox 12×27. Aucun fichier image/son : textures générées par code, SFX WebAudio.
src/: config.ts (TOUTES les valeurs réglables), input.ts, scenes/, entities/Player.ts, entities/Boss.ts, patterns/, bosses/ (1 fichier de données par boss), art/, audio/sfx.ts, ui/.
`scene.restart()` ne relance pas les initialiseurs de champs : tout réinitialiser dans create().

## Contrôles (un seul schéma, touches PHYSIQUES via e.code)
←/→ bouger · Saut ↑/Espace · Descendre ↓ · Attaque A · Dash Z · Sort E (AZERTY ; = Q/W/E en QWERTY, même emplacement) · Pause Échap/P. R libre. Menus : ↑↓, valider Entrée/Espace, souris. OPTIONS > CLAVIER AZERTY/QWERTY (localStorage, try/catch) ne change que les lettres affichées (input.keyLabel). HUD contrôles en haut à droite sauf dans le tuto (panneaux placés : sol, au-dessus des plateformes, suspendu). `input.reset()` à chaque ouverture/fermeture de menu. Pas de manette.
DEV seulement : F1 boss à 1 PV, F2 invincible, URL `#Boss1`/`#Test` = démarrage direct sur la scène, `window.game` exposé (gate `import.meta.env.DEV`).
Test visuel : chrome-headless-shell de ~/.cache/ms-playwright + libs nspr/nss/asound extraites localement (apt-get download + dpkg -x, LD_LIBRARY_PATH), piloté via CDP (WebSocket Node) sur `bun run dev`.

## Joueur
Vif, saut variable, coyote 0,1 s, buffer 0,1 s, double saut via flag (off). Dash = esquive : i-frames tout le dash (~0,22 s), ~84 px, cd ~0,55 s, direction tenue sinon face, 1 dash aérien rechargé au sol, images rémanentes. Combo 3 coups aux dagues (visuel seul : frames atkI_F dans art/player.ts, hitbox = config.combo), +1 mana par coup touché. Mort : genou à terre puis dissolution en cendres (deathRetryDelay). Cinématiques : Player.walkTo, ui/Iris.ts (portail). Mana pleine → "Éclat lunaire" (croissant perforant). 3 PV (choix utilisateur), invu 1,2 s, recul, hit-stop 70 ms.

## Boss (data-driven)
Boss générique unique. Pattern = télégraphe → actif → récupération (boss ouvert, yeux éteints). Télégraphe ≥ 0,6 s (P1) / ≥ 0,45 s (P2), couleur danger. Sélection pondérée, jamais 3× le même, pause ≥ 0,4 s. À 50 % PV : 1 s invu + rugissement + tremblement, nouveaux patterns, vitesse ×1,15. Barre de vie nommée EN BAS (phase 2 : la moitié restante remplit la barre). Arène 2 écrans. Annonceur (ui/Announcer.ts, ~2,3 s, jeu figé via ArenaScene.frozen, rejoué après une mort, sauté via pause > recommencer).
- Boss 1 « Mordrec, le Chevalier Creux » (140 PV, récupérations courtes ; animations lourdes : rig, traînées, débris, ondes de pics, épées fantômes) : taille en arc (dash), saut écrasant + repère au sol + onde rasante (sauter), 2 lames spectrales rasantes (M.blades.count). P2 : enchaînement 3 coups rythme varié, onde double.
- Boss 2 « Corvina, la Veuve aux Corbeaux » (~100 PV, flotte) : éventail 5 plumes, colonnes d'ombre (3 marques 0,8 s), disparition → réapparition sur un bord + faux en arc. P2 : 3 orbes en orbite puis tirés, colonnes en vague alternée, feinte (+0,4 s).

## DA
Hi-bit, contour 1 px joueur/boss. Cyan lune = joueur/sorts. Rouge/magenta = DANGER uniquement (jamais PV/HUD/déco). Orange braise = ambiance. Fond #0b0a14 / #1a1630, pierre gris-bleu. Parallaxe 4 couches, torches (halo additif), citrouilles, bougies, chauves-souris, toiles, poussière, vignette. Salle 1 nef vitraux bleus ; salle 2 vitraux pourpres + rosace. HUD + contrôles EN HAUT.
Boss grands (⅓–½ écran), pièces séparées animées par tweens, yeux lumineux. Juice : hit-stop, shake léger, particules, flash blanc.

## Parcours
Menu JOUER → choix NORMAL (« SAUVEGARDE AU DÉBUT DE CHAQUE BOSS ») / DIFFICILE (sans sauvegarde), état `run.hard` dans floors.ts → OutsideScene (spawn x 190 ; porte à droite ; à gauche portail violet + pancarte TUTO → TestScene, portail retour à gauche du tuto, entities/Portal.ts) → Boss1 (RDC, la nef) → victoire : grille levée → escalier → TransitScene (« ÉTAGE N », escalier en colimaçon dans une tour en coupe, art/tower.ts) → étage suivant ou fin provisoire. Étages en données : src/floors.ts.

## Étapes
0 setup ✔ · 1 salle de test + joueur + HUD ✔ · 1b 480×270 + art détaillé + menu titre (JOUER/OPTIONS/QUITTER ; le tuto passe par le portail du château) + pause (reprendre/recommencer/menu) + tuto = salle de test avec panneaux ✔ (JOUER → salle de test en attendant l'étape 2 : à rebrancher sur l'arène 1) · 2 Boss générique (coroutines, entities/Boss.ts) + Mordrec (bosses/mordrec.ts) + nef parallaxe 4 couches (art/nave.ts, scenes/rooms.ts) + barre nommée + intro/retry/victoire ✔ (victoire → menu en attendant l'étape 3) · 2c plein écran, arène ×2, animations lourdes, annonceur, château/escalier ✔ · 2d contrôles flèches + A/Z/E, options clavier, écran de mort, panneaux du tuto ✔ · 2e GAME OVER rouge, options en pause (ui/Options.ts), étiquette d'étage de l'annonceur en haut, barre du boss à 50 % : brille en or 3 s puis se recharge (la moitié restante = barre pleine), pics de roche propres (sortent/rentrent par échelle), nef refaite en un seul édifice (voûte / mur à travées + rosace / piliers isolés) + mur de fond avec porte d'escalier, menu titre (logo + boutons encadrés à gauche, scène vivante à droite, curseur qui glisse et pointe) ✔ · 2f (à faire) château extérieur moins « tour », lames spectrales plus propres · 3 Corvina (ÉTAGE 1, ajouter à floors.ts) + salle 2 + victoire finale · plus tard : options (à discuter avec l'utilisateur), son d'ambiance, polish, build final.
