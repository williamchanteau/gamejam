// Toutes les valeurs réglables du jeu. (Résolution 480×270 : distances ×1,5 par rapport au 320×180 initial.)
export const W = 480;
export const H = 270;
export const DEV = import.meta.env.DEV;

export const PHYS = {
  gravity: 1650,
  fallGravityMult: 1.35, // gravité plus forte en chute (saut plus nerveux)
  maxFall: 495,
};

export const ARENA = {
  floorY: 234,
  platforms: [
    { x: 108, y: 177, w: 84 },
    { x: 372, y: 177, w: 84 },
  ],
};

export const PLAYER = {
  hp: 5,
  runSpeed: 172,
  accelGround: 2400,
  accelAir: 1650,
  decelGround: 3000,
  jumpVel: 495, // hauteur ≈ v² / 2g ≈ 74 px
  jumpCut: 0.45, // relâcher le saut tôt = saut plus court
  coyote: 0.1,
  jumpBuffer: 0.1,
  doubleJump: false,
  doubleJumpVel: 435,
  dropThrough: 0.25, // durée pendant laquelle on traverse une plateforme (S/↓)

  dashDist: 84,
  dashTime: 0.22,
  dashCooldown: 0.55,
  airDashes: 1,
  afterimageEvery: 0.035,

  attackBuffer: 0.15,
  attackMoveMult: 0.45,
  comboReset: 0.35, // délai max entre deux coups pour continuer le combo
  combo: [
    { damage: 3, windup: 0.04, active: 0.08, recover: 0.16, reach: 33, lunge: 60 },
    { damage: 3, windup: 0.04, active: 0.08, recover: 0.16, reach: 33, lunge: 60 },
    { damage: 5, windup: 0.07, active: 0.1, recover: 0.26, reach: 42, lunge: 105 },
  ],
  chainAfter: 0.05, // après la fin de l'actif, on peut enchaîner le coup suivant
  hitstopOnHit: 0.04,

  manaMax: 8,
  manaPerHit: 1,
  spell: { damage: 20, speed: 345, life: 1.4, castTime: 0.22, recoil: 90 },

  invuln: 1.2,
  hurtStun: 0.22,
  knockbackX: 165,
  knockbackY: 225,
  hitstop: 0.07,
  deathRetryDelay: 0.8, // s avant le retry
};

// Salle de test : épouvantail qui tire des orbes lentes.
export const DUMMY = {
  fireEvery: 3,
  telegraph: 0.7,
  orbSpeed: 112,
  orbLife: 5,
};

// Boss générique (les valeurs propres à chaque boss sont dans bosses/).
export const BOSS = {
  teleMinP1: 0.6, // télégraphe minimum (s) phase 1
  teleMinP2: 0.45, // ... phase 2
  pauseMin: 0.4, // pause minimum entre deux patterns
  idlePause: [0.6, 0.9], // pause entre patterns (avant ×vitesse)
  p2Speed: 1.15,
  p2Invuln: 1, // durée du rugissement à 50 % PV
  introTime: 2,
  retryDelay: 0.5, // délai avant la 1re attaque après un retry (intro sautée)
  walkSpeed: 45,
  walkRange: 150, // marche vers le joueur s'il est plus loin que ça
  victoryTime: 4,
};

export const AUDIO = { volume: 0.35 };

// Couleurs (rouge/magenta réservés au DANGER).
export const COL = {
  moon: 0x7ff6ff,
  moonLight: 0xd8fbff,
  danger: 0xff2a5a,
  ember: 0xff8a2a,
  ui: 0xc8cfe8,
  uiDim: 0x6a6f8e,
};
