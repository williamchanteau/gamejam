// Toutes les valeurs réglables du jeu.
export const W = 320;
export const H = 180;
export const DEV = import.meta.env.DEV;

export const PHYS = {
  gravity: 1100,
  fallGravityMult: 1.35, // gravité plus forte en chute (saut plus nerveux)
  maxFall: 330,
};

export const ARENA = {
  floorY: 156,
  platforms: [
    { x: 72, y: 118, w: 56 },
    { x: 248, y: 118, w: 56 },
  ],
};

export const PLAYER = {
  hp: 5,
  runSpeed: 115,
  accelGround: 1600,
  accelAir: 1100,
  decelGround: 2000,
  jumpVel: 330, // hauteur ≈ v² / 2g ≈ 50 px
  jumpCut: 0.45, // relâcher le saut tôt = saut plus court
  coyote: 0.1,
  jumpBuffer: 0.1,
  doubleJump: false,
  doubleJumpVel: 290,
  dropThrough: 0.25, // durée pendant laquelle on traverse une plateforme (↓ + saut)

  dashDist: 56,
  dashTime: 0.22,
  dashCooldown: 0.55,
  airDashes: 1,
  afterimageEvery: 0.035,

  attackBuffer: 0.15,
  attackMoveMult: 0.45,
  comboReset: 0.35, // délai max entre deux coups pour continuer le combo
  combo: [
    { damage: 3, windup: 0.04, active: 0.08, recover: 0.16, reach: 22, lunge: 40 },
    { damage: 3, windup: 0.04, active: 0.08, recover: 0.16, reach: 22, lunge: 40 },
    { damage: 5, windup: 0.07, active: 0.1, recover: 0.26, reach: 28, lunge: 70 },
  ],
  chainAfter: 0.05, // après la fin de l'actif, on peut enchaîner le coup suivant
  hitstopOnHit: 0.04,

  manaMax: 8,
  manaPerHit: 1,
  spell: { damage: 20, speed: 230, life: 1.4, castTime: 0.22, recoil: 60 },

  invuln: 1.2,
  hurtStun: 0.22,
  knockbackX: 110,
  knockbackY: 150,
  hitstop: 0.07,
  deathRetryDelay: 0.8, // s avant le retry
};

// Salle de test : épouvantail qui tire des orbes lentes.
export const DUMMY = {
  fireEvery: 3,
  telegraph: 0.7,
  orbSpeed: 75,
  orbLife: 5,
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
