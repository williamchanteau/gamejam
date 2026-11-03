import Phaser from 'phaser';

// Police 3×5 : chaque chiffre = une ligne, bits 4/2/1 = pixel gauche/milieu/droite.
export const G: Record<string, string> = {
  A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755',
  I: '72227', J: '11152', K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644',
  Q: '25563', R: '65655', S: '34216', T: '72222', U: '55557', V: '55552', W: '55775', X: '55255',
  Y: '55222', Z: '71247', '0': '75557', '1': '26227', '2': '61247', '3': '61216', '4': '55711',
  '5': '74616', '6': '34757', '7': '71222', '8': '75757', '9': '75716', ' ': '00000', '.': '00002',
  ',': '00022', ':': '02020', '!': '22202', '?': '61202', "'": '22000', '-': '00700', '+': '02720',
  '/': '11244', '(': '24442', ')': '42224', '·': '00200', '%': '51245', '=': '07070', '>': '42124',
  '<': '12421', '←': '12721', '→': '42724', '↑': '27222', '↓': '22272', '"': '55000', '*': '05250',
};
// Accents : pixels [x, y] dans la cellule (glyphe aux lignes 3..7).
const AC = [[2, 0], [1, 1]], GR = [[0, 0], [1, 1]], CI = [[1, 0], [0, 1], [2, 1]], TR = [[0, 1], [2, 1]], CE = [[1, 8], [0, 9]];
const ACC: Record<string, [string, number[][]]> = {
  'É': ['E', AC], 'È': ['E', GR], 'Ê': ['E', CI], 'Ë': ['E', TR], 'À': ['A', GR], 'Â': ['A', CI],
  'Ç': ['C', CE], 'Ù': ['U', GR], 'Û': ['U', CI], 'Î': ['I', CI], 'Ï': ['I', TR], 'Ô': ['O', CI],
};

const CW = 4, CH = 10, PER = 16;

export function makeFont(scene: Phaser.Scene) {
  const chars = Object.keys(G).join('') + Object.keys(ACC).join('');
  const rows = Math.ceil(chars.length / PER);
  const tex = scene.textures.createCanvas('fontTex', PER * CW, rows * CH)!;
  const c = tex.getContext();
  c.fillStyle = '#fff';
  [...chars].forEach((ch, i) => {
    const ox = (i % PER) * CW, oy = Math.floor(i / PER) * CH;
    const [base, acc] = ACC[ch] ?? [ch, []];
    const code = G[base];
    for (let r = 0; r < 5; r++)
      for (let b = 0; b < 3; b++) if (+code[r] & (4 >> b)) c.fillRect(ox + b, oy + 3 + r, 1, 1);
    for (const [x, y] of acc) c.fillRect(ox + x, oy + y, 1, 1);
  });
  tex.refresh();
  scene.cache.bitmapFont.add('px', Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'fontTex', width: CW, height: CH, chars, charsPerRow: PER,
    'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0,
  }));
}

/** Texte en police pixel (majuscules). Le glyphe commence 3 px sous y. */
export function txt(scene: Phaser.Scene, x: number, y: number, s: string, color = 0xffffff) {
  return scene.add.bitmapText(x, y, 'px', s.toUpperCase(), CW).setTint(color);
}
