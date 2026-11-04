# Musique d'ASHENBORN

Tout est généré par le code : carrés (rapport cyclique 12,5 / 25 / 50 %), triangle, bruit. Aucun fichier audio, aucune mélodie reprise.

- Tonalités : ré mineur et mi phrygien. Passages en ré majeur pour la victoire et la fin.
- Écoute debug : `bun run dev`, puis l'adresse affichée suivie de `#Musique` (ex. `http://localhost:5173/#Musique`). Appuyer une fois sur une touche pour débloquer le son.
- Juke-box : `↑↓` piste, `Entrée` écouter, `P` phase 2, `C` section suivante (trône), `V` victoire, `D` défaite, `S` stop, `M` couper.
- Console du navigateur (dev) : `music.play('boss1', 0.3, true)`, `music.setPhase(2)`, `music.info()`.

## Les pistes

| Piste | Où et quand | Déclencheur exact | Boucle, BPM, durée | Écoute debug |
|---|---|---|---|---|
| `menu` | Menu principal, choix de la difficulté. Aussi au retour depuis un combat, un GAME OVER ou la fin | `main.ts` (`CREATE`) → `music.ts` `scene('Menu')` | Boucle, 80 BPM, 16 mesures, 48 s | `#Musique` → MENU |
| `library` | Tuto (salle de test) : thème calme de bibliothèque, tic-tac d'horloge | `main.ts` → `music.ts` `scene('Test')` | Boucle, 69 BPM, 16 mesures, 55,7 s | `#Musique` → LIBRARY |
| `explore` | Après la victoire sur Ysolde et Nycthor, escalier de la tour (`Transit`) | Après un jingle : `BossScene.ts` `victory()` (`afterWin`). Tour : `scene('Transit')` | Boucle, 84 BPM, 8 mesures, 22,9 s | `#Musique` → EXPLORE |
| `announce` | Annonce de chaque boss. Cloche à 0,70 s sur l'apparition du nom, accord sec à 2,30 s sur « EN GARDE ! », combat à 3,0 s | Début : `BossScene.ts` `intro()` → `music.stinger('announce')`. Cloche et accord : `Announcer.ts` `announce()` → `music.hit('name')`, `music.hit('garde')` | Non bouclé, sans BPM, 3,0 s (l'accord tient jusqu'à 3,6 s si le combat tarde) | `#Musique` → ANNOUNCE |
| `boss1` P1 | Ysolde (rez-de-chaussée, la nef), phase 1 | `BossScene.ts` `intro()` → `music.fight('Boss1')` à la fin de l'annonce, ou direct après PAUSE > RECOMMENCER | Boucle, 148 BPM, 16 mesures, 25,9 s | `#Musique` → BOSS1 |
| `boss1` P2 | Ysolde sous 50 % de PV : mesure suivante + fill. Lead à l'octave, arpèges rapides, charleston doublé | `Boss.ts` `toPhase2()` → `music.setPhase(2)` | Boucle, 148 BPM, 16 mesures, 25,9 s | BOSS1 puis `P` |
| `boss2` P1 | Nycthor (étage 1, la crypte), phase 1. Mi phrygien | Comme `boss1` → `music.fight('Boss2')` | Boucle, 140 BPM, 16 mesures, 27,4 s | `#Musique` → BOSS2 |
| `boss2` P2 | Nycthor sous 50 % de PV | `Boss.ts` `toPhase2()` | Boucle, 140 BPM, 16 mesures, 27,4 s | BOSS2 puis `P` |
| `boss3` P1 | McKing (étage 2, la salle à manger), phase 1. Marche pompeuse | Comme `boss1` → `music.fight('Boss3')`, après la cinématique (`BurgerScene.ts` `pan()` → `intro()`) | Boucle, 150 BPM, 16 mesures, 25,6 s | `#Musique` → BOSS3 |
| `boss3` P2 | McKing sous 50 % de PV | `Boss.ts` `toPhase2()` | Boucle, 150 BPM, 16 mesures, 25,6 s | BOSS3 puis `P` |
| `victory` | Mort d'un boss, 1,3 s après (avec le bandeau « EST TOMBÉ ») | `BossScene.ts` `victory()` → `music.stinger('victory', afterWin)` | Non bouclé, 120 BPM, 3,8 s | `V`, ou VICTORY |
| `defeat` | Écran GAME OVER. Glas au claquement du titre (0,4 s) | `main.ts` → `music.ts` `scene('GameOver')` | Non bouclé, 75 BPM, 4 s (la cloche résonne jusqu'à 4,5 s) | `D`, ou DEFEAT |
| `dawn` | 1re cinématique de fin : le château, la nuit cède au jour. Passe en majeur à 3,33 s, fanfare à 4,8 s, sommet à 5,6 s | `main.ts` → `music.ts` `scene('Dawn')` | Non bouclé, 72 BPM, 2 mesures, 6,67 s (la scène dure 6,65 s) | `#Musique` → DAWN |
| `throne` | 2e cinématique de fin : marche (le motif de McKing en majeur), silence tendu, « VIVE LE ROI », il s'assoit, générique et écran FIN | Début : `scene('Throne')`. Sections : `ThroneScene.ts` `present()` `music.cue(3)`, `crowned()` `music.cue(5)`, `rollCredits()` `music.cue(8)` | 126 BPM. Marche 5,4 s, silence 4,1 s, couronnement 3,4 s, assis 1,3 s, puis générique en boucle (8 mesures, 15,2 s) | `#Musique` → THRONE, puis `C` |

Les bruitages de l'orage ne sont pas de la musique : ils passent par le bus des bruitages (`sfx.ts` `stormSound`, `thunder`, lancés par `art/storm.ts` `addStorm`) et suivent donc le curseur EFFETS.

## L'enchaînement d'une partie

Menu `menu` → JOUER, difficulté → **devant le château : pas de musique, tempête**
(option : portail → tuto `library` → retour au château, sans musique)
→ porte → **Ysolde** : `announce` → `boss1` P1 → P2 → `victory` → `explore`
→ escalier de la tour : `explore` continue
→ **Nycthor** : `announce` → `boss2` P1 → P2 → `victory` → `explore`
→ escalier : `explore` continue
→ Salle à manger : silence dès l'arrivée, pendant le repas et le premier cri du roi → **McKing** : `announce` → `boss3` P1 → P2 → `victory` → silence, on ramasse la couronne
→ cinématique de l'aube `dawn` → cinématique du trône `throne` → générique → écran FIN (`throne` boucle) → `menu`, au début de la mesure suivante

Si le joueur meurt en combat : `defeat` → DERNIÈRE SAUVEGARDE → `announce` → le combat repart en phase 1.
PAUSE > RECOMMENCER : le combat repart aussitôt en phase 1, sans annonce.

## Les moments sans musique

| Moment | Durée | Pourquoi |
|---|---|---|
| Menu, avant la première touche ou le premier clic | Jusqu'au geste | Le navigateur bloque le son. Le menu démarre dès le premier appui |
| Devant le château, jusqu'à l'annonce d'Ysolde | Selon le joueur | Demandé : pluie, vent et tonnerre seulement |
| Mort d'un boss → jingle de victoire | 1,3 s | Le combat s'éteint en 0,8 s, on laisse la place à l'explosion |
| Après le jingle de McKing, jusqu'à l'aube | Selon le joueur (≈ 10 s) | Choix : calme après le dernier combat. Pour le changer : `afterWin` dans `BurgerScene.ts` |
| Arrivée dans la salle de McKing, jusqu'à l'annonce (repas, choix de l'amélioration, premier cri, travelling) | Selon le joueur | Demandé : effet de surprise. `BurgerScene.ts` `intro()` → `music.stop` |
| Écran GAME OVER, après le jingle | Jusqu'au choix du joueur | Pas de boucle demandée sur la défaite |

Pendant l'agonie du héros, la musique du combat continue jusqu'à l'écran GAME OVER.

## Réglages

- Balance musique / effets : `AUDIO.balMusic` et `AUDIO.balSfx` dans `src/config.ts`. Curseurs à fond = effets à l'ancien 30 % (0,09) et musique à 120 % (1,44).
- Volumes de la musique : `VOL`, en haut de `src/audio/chip.ts`. `VOL.all` règle toute la musique d'un coup.
- Niveaux mesurés (rendu hors ligne) : combats à −28 dB en crête et −42 dB RMS, `sfx.hit` à −40 dB et `sfx.slam` à −42 dB en crête, pluie à −42 dB RMS, tonnerre proche à −27 dB en crête. **La musique passe donc au-dessus des effets**, comme demandé en dernier : cela remplace la règle de départ « musique plus basse que les bruitages ».
- L'orage garde son niveau quelle que soit `balSfx` : sans musique, il tient lieu d'ambiance. Le curseur EFFETS continue de le régler.
- M coupe la musique seule, les bruitages restent. L'état est enregistré. La touche suit la lettre imprimée, donc elle marche aussi en AZERTY. Si M est attribuée à une action, l'action a la priorité.
- Pause : musique plus basse et étouffée, pluie plus lointaine.

## Ce qui est quantifié, et ce qui ne l'est pas

- Au début de la mesure : la phase 2 (avec fill), et les changements de piste faits par `play()` quand l'ancienne boucle sur des mesures de 2 s ou moins (trône → menu).
- Immédiats, en fondu, pour rester calés sur l'image : les stingers (la cloche et « EN GARDE ! » partent de l'image elle-même), les sections du trône (`cue`), RECOMMENCER, le retour au menu depuis un combat, le début de l'aube et du trône. Sinon la cloche manquerait le nom, et un combat continuerait jusqu'à 1,6 s dans le menu.
- Depuis un morceau lent (menu, tuto, escalier), on ne change jamais de piste en attendant la mesure : ces scènes mènent au silence ou à un stinger. Attendre laisserait jusqu'à 3,5 s de musique de trop.
