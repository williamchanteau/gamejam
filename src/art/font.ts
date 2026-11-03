import Phaser from 'phaser';

// Police 5×7 : 7 lignes par glyphe, chaque ligne = 1 chiffre base 32 (bit 16 = pixel de gauche).
export const G: Record<string, string> = {
  A: 'EHHVHHH', B: 'UHHUHHU', C: 'EHGGGHE', D: 'UHHHHHU', E: 'VGGUGGV', F: 'VGGUGGG', G: 'EHGNHHF',
  H: 'HHHVHHH', I: 'E44444E', J: '72222IC', K: 'HIKOKIH', L: 'GGGGGGV', M: 'HRLLHHH', N: 'HHPLJHH',
  O: 'EHHHHHE', P: 'UHHUGGG', Q: 'EHHHLID', R: 'UHHUKIH', S: 'FGGE11U', T: 'V444444', U: 'HHHHHHE',
  V: 'HHHHHA4', W: 'HHHLLLA', X: 'HHA4AHH', Y: 'HHA4444', Z: 'V1248GV',
  '0': 'EHJLPHE', '1': '4C4444E', '2': 'EH1248V', '3': 'V2421HE', '4': '26AIV22', '5': 'VGU11HE',
  '6': '68GUHHE', '7': 'V124888', '8': 'EHHEHHE', '9': 'EHHF12C',
  ' ': '0000000', '.': '00000CC', ',': '0000CC8', ':': '0CC0CC0', '!': '4444404', '?': 'EH12404',
  "'": '4480000', '-': '000E000', '+': '044V440', '/': '11248GG', '(': '2488842', ')': '8422248',
  '·': '000C000', '%': 'OP248J3', '=': '00V0V00', '>': '8421248', '<': '248G842', '←': '048V840',
  '→': '042V240', '↑': '4EL4444', '↓': '4444LE4', '"': 'AA00000', '*': '04LEL40',
};
// Accents : pixels [x, y] dans la cellule (glyphe aux lignes 3..9).
const AC = [[3, 0], [2, 1]], GR = [[1, 0], [2, 1]], CI = [[2, 0], [1, 1], [3, 1]], TR = [[1, 1], [3, 1]], CE = [[2, 10], [1, 11]];
const ACC: Record<string, [string, number[][]]> = {
  'É': ['E', AC], 'È': ['E', GR], 'Ê': ['E', CI], 'Ë': ['E', TR], 'À': ['A', GR], 'Â': ['A', CI],
  'Ç': ['C', CE], 'Ù': ['U', GR], 'Û': ['U', CI], 'Î': ['I', CI], 'Ï': ['I', TR], 'Ô': ['O', CI],
};

const CW = 6, CH = 12, PER = 16;

/** Ligne `r` (0..6) du glyphe `ch` : bits, 16 = pixel de gauche. */
export const glyphRow = (ch: string, r: number) => parseInt(G[ch][r], 32);

export function makeFont(scene: Phaser.Scene) {
  const chars = Object.keys(G).join('') + Object.keys(ACC).join('');
  const rows = Math.ceil(chars.length / PER);
  const tex = scene.textures.createCanvas('fontTex', PER * CW, rows * CH)!;
  const c = tex.getContext();
  c.fillStyle = '#fff';
  [...chars].forEach((ch, i) => {
    const ox = (i % PER) * CW, oy = Math.floor(i / PER) * CH;
    const [base, acc] = ACC[ch] ?? [ch, []];
    for (let r = 0; r < 7; r++)
      for (let b = 0; b < 5; b++) if (glyphRow(base, r) & (16 >> b)) c.fillRect(ox + b, oy + 3 + r, 1, 1);
    for (const [x, y] of acc) c.fillRect(ox + x, oy + y, 1, 1);
  });
  tex.refresh();
  scene.cache.bitmapFont.add('px', Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'fontTex', width: CW, height: CH, chars, charsPerRow: PER,
    'offset.x': 0, 'offset.y': 0, 'spacing.x': 0, 'spacing.y': 0, lineSpacing: 0,
  }));
}

/** Texte en police pixel (majuscules). Le glyphe commence 3 px sous y, hauteur 7. */
export function txt(scene: Phaser.Scene, x: number, y: number, s: string, color = 0xffffff) {
  return scene.add.bitmapText(x, y, 'px', s.toUpperCase(), CW).setTint(color);
}
