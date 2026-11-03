// DEV uniquement : « Demander une modif » → prompt contextuel à coller dans Claude Code (aucun appel réseau).
import { BOSS, PLAYER } from '../config';
import { V, ENTITIES, animsOf } from './anims';

// Params d'art de chaque entité (vide tant que src/art/params/ n'existe pas).
const PARAMS = import.meta.glob('../art/params/*.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const KEY = 'ashenborn.viewer.asks';
const TYPES: Record<string, string> = {
  anim: 'Modifier une anim', design: 'Modifier le design / la texture', timing: "Ajuster le timing d'un pattern",
  sort: 'Nouveau sort joueur', pattern: 'Nouveau pattern de boss', autre: 'Autre',
};
const SEG: Record<string, string> = { t: 'télégraphe', a: 'actif', r: 'récup', n: 'neutre' };
const sec = (x: number) => x.toFixed(2).replace('.', ',');
type Item = { d: string; type: string; ask: string; text: string };

let box: HTMLElement;
const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => box.querySelector('#a-' + id) as T;
const val = (id: string) => $(id).value.trim() || '—';
const load = (): Item[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };
const save = (l: Item[]) => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 10))); } catch { /* stockage bloqué */ } };
const f = (id: string, label: string, input = `<input id="a-${id}">`) => `<label>${label}${input}</label>`;
const opts = (l: string[]) => l.map((o) => `<option>${o}</option>`).join('');

/** Rouge / magenta (réservés au danger) ? */
function dangerHue(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 0.25) return false;
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return h * 60 > 285 || h * 60 < 25;
}

export function buildAsk(root: HTMLElement) {
  box = document.createElement('details');
  box.id = 'ask';
  const bosses = ENTITIES.filter((e) => e.boss).map((e) => e.label);
  box.innerHTML = `<style>#ask>div{display:flex;flex-direction:column;gap:6px;margin-top:6px}#ask label{display:block}
#ask input,#ask textarea,#ask select{display:block;width:100%;box-sizing:border-box;background:#0e0d13;color:inherit;border:1px solid #48475a;font:inherit;padding:2px 4px}
#ask .aform{display:none;gap:4px;border-left:2px solid #7ff6ff;padding-left:6px}#ask .aform.on{display:grid}
#a-hist div{cursor:pointer;padding:2px 0;border-bottom:1px solid #2a2934}#a-hist div:hover{color:#7ff6ff}#a-ok{color:#7ff6ff}</style>
<summary><b>DEMANDER UNE MODIF</b></summary><div>
${f('type', 'Type de demande', `<select id="a-type">${Object.entries(TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>`)}
<div class="aform" id="a-sort">${f('sname', 'Nom')}${f('skey', 'Touche')}${f('skind', 'Type', `<select id="a-skind">${opts(['projectile', 'zone', 'dash-attaque', 'buff', 'invocation'])}</select>`)}
${f('sdmg', 'Dégâts')}${f('scost', 'Coût en mana ou cooldown')}${f('srange', 'Portée (px)')}${f('sspeed', 'Vitesse (px/s)')}
${f('scol', 'Couleur (palette lune/cyan)', '<input id="a-scol" type="color" value="#7ff6ff">')}
${f('svis', 'Visuel : cast, trajectoire, impact', '<textarea id="a-svis" rows="3"></textarea>')}${f('ssnd', 'Ambiance sonore (SFX synthétisé)')}</div>
<div class="aform" id="a-pattern">${f('pboss', 'Boss cible', `<select id="a-pboss">${opts(bosses)}</select>`)}${f('pname', 'Nom')}
${f('ptele', 'Télégraphe : forme', '<textarea id="a-ptele" rows="2"></textarea>')}${f('pdur', 'Télégraphe : durée (s)', '<input id="a-pdur" type="number" step="0.05" min="0" value="0.7">')}
${f('pact', 'Phase active', '<textarea id="a-pact" rows="2"></textarea>')}${f('prec', 'Récupération / fenêtre de punition (s)', '<input id="a-prec" type="number" step="0.05" min="0" value="0.6">')}
${f('pdmg', 'Dégâts')}${f('pphase', 'Phase', `<select id="a-pphase">${opts(['1', '2', '1 et 2'])}</select>`)}</div>
${f('ask', 'Que veux-tu changer ?', '<textarea id="a-ask" rows="4"></textarea>')}
<div><button id="a-copy">Copier le prompt</button> <span id="a-ok"></span></div>
<textarea id="a-out" rows="8" readonly placeholder="Le prompt généré apparaît ici"></textarea>
<b>Historique (10 dernières)</b><div id="a-hist"></div></div>`;
  root.appendChild(box);
  // Taper du texte ne doit pas piloter le jeu (A/Z/E, flèches, Espace, P…).
  for (const t of ['keydown', 'keyup']) box.addEventListener(t, (e) => e.stopPropagation());
  $<HTMLSelectElement>('type').onchange = () => {
    const t = $('type').value;
    $('sort').classList.toggle('on', t === 'sort');
    $('pattern').classList.toggle('on', t === 'pattern');
    const e = ENTITIES[V.ent];
    if (t === 'pattern' && e.boss) $('pboss').value = e.label;
  };
  $('copy').onclick = async () => {
    const text = makePrompt(), list = load();
    $<HTMLTextAreaElement>('out').value = text;
    list.unshift({ d: new Date().toLocaleString('fr-FR'), type: $('type').value, ask: $('ask').value.trim(), text });
    save(list);
    history();
    await copy(text);
  };
  history();
}

async function copy(text: string) {
  const ok = $('ok');
  try { await navigator.clipboard.writeText(text); }
  catch { const o = $<HTMLTextAreaElement>('out'); o.value = text; o.select(); document.execCommand('copy'); }
  ok.textContent = 'COPIÉ ✓';
  setTimeout(() => (ok.textContent = ''), 1500);
}

function history() {
  const h = $('hist');
  h.replaceChildren(...load().map((it) => {
    const d = document.createElement('div');
    d.textContent = `${it.d} · ${TYPES[it.type] ?? it.type} — ${it.ask.slice(0, 50) || '…'}`;
    d.onclick = () => { $<HTMLTextAreaElement>('out').value = it.text; copy(it.text); };
    return d;
  }));
}

function makePrompt() {
  const e = ENTITIES[V.ent], anims = animsOf(e), a = anims[V.anim] ?? anims[0], type = $('type').value;
  const pat = a.pattern ? e.boss!.patterns[V.anim - 1] : undefined;
  const L = [`# DEMANDE DEPUIS LE VIEWER — ${TYPES[type].toUpperCase()}`, '', '## Contexte du viewer (/?viewer)',
    `- Entité : ${e.label}`, `- Animation / état : ${a.label}`,
    `- Temps : image ${V.frame} / ${V.total} (${sec(V.frame / 60)} s / ${sec(V.total / 60)} s), vitesse ${sec(V.speed).slice(0, -1)}×`];
  if (e.boss) L.push(`- Phase : ${V.phase}`);
  if (a.pattern && V.segs.length) {
    L.push(`- Frise mesurée : ${V.segs.filter((s) => s.n > 1).map((s) => `${SEG[s.k]} ${sec(s.n / 60)} s`).join(' → ')}`);
    if (V.teles.length) L.push(`- Appels b.tele() (demandé → obtenu) : ${V.teles.map((t) => `${sec(t.req)} → ${sec(t.got)} s`).join(', ')}`);
  }
  // Entité visée : le joueur pour un sort, le boss cible pour un pattern, sinon celle du viewer.
  const tg = type === 'sort' ? ENTITIES.find((x) => !x.boss)! : type === 'pattern' ? ENTITIES.find((x) => x.label === $('pboss').value)! : e;
  if (tg !== e) L.push(`- Entité visée par la demande : ${tg.label}`);
  const pj = PARAMS[`../art/params/${tg.id}.json`];
  L.push(`- Params d'art de ${tg.label} (src/art/params/${tg.id}.json) : ${pj ? JSON.stringify(pj) : "pas encore de fichier : les valeurs d'art restent dans le code de dessin, ne crée pas src/art/params/"}`);
  const d = tg.boss;
  L.push(`- Gameplay actuel : ${JSON.stringify(d ? { hp: d.hp, hurt: d.hurt, patterns: d.patterns.map(({ name, weight, phase, far, elevated }) => ({ name, weight, phase, far, elevated })) } : PLAYER)}`);
  L.push('', '## Fichiers concernés', ...tg.files.map((x) => `- ${x}`), ...(pj ? [`- src/art/params/${tg.id}.json (valeurs d'art)`] : []), '- src/viewer/anims.ts (animations sélectionnables du viewer)');
  if (pat && tg === e) L.push(`- Pattern « ${pat.name} » : entrée de ${d!.name}.patterns dans src/bosses/${e.id}.ts`);
  if (type === 'timing') L.push('', 'Timing : modifie les durées dans la constante du boss (src/bosses/*.ts), pas dans les params d\'art. Vérifie la frise du viewer après coup.');
  if (type === 'sort') {
    const col = $('scol').value;
    L.push('', '## Nouveau sort joueur', `- Nom : ${val('sname')} · Touche : ${val('skey')} · Type : ${val('skind')}`,
      `- Dégâts : ${val('sdmg')} · Coût mana / cooldown : ${val('scost')} · Portée : ${val('srange')} px · Vitesse : ${val('sspeed')} px/s`,
      `- Couleur : ${col}${dangerHue(col) ? ' ⚠ proche du rouge/magenta, réservé au danger : propose une teinte lune/cyan' : ''}`,
      `- Visuel (cast, trajectoire, impact) : ${val('svis')}`, `- Son : ${val('ssnd')}`, '', 'Exigences :',
      "- Réutilise l'existant au lieu de recréer : Éclat lunaire (Player.cast → ArenaScene.spawnSpell/updateSpells), textures de src/art/fx.ts, particules ArenaScene (sparks, puffs, debris), SFX synthétisés de src/audio/sfx.ts (WebAudio, aucun fichier son). src/patterns/ est vide : y mettre le code s'il est partagé.",
      '- Valeurs de gameplay dans PLAYER (src/config.ts).',
      '- Ajoute-le comme animation sélectionnable du JOUEUR dans le viewer (playerAnims de src/viewer/anims.ts).',
      "- Ne casse pas l'Éclat lunaire existant.",
      '- Contrôles : un seul schéma par touches physiques (src/input.ts) ; si une nouvelle touche est nécessaire, dis-le-moi et mets à jour l\'affichage des contrôles.');
  }
  if (type === 'pattern') {
    const b = ENTITIES.find((x) => x.label === $('pboss').value)!, ph = $('pphase').value, dur = +$('pdur').value;
    // Comme b.tele() : en phase 2 la durée est divisée par p2Speed avant d'être comparée au minimum.
    const w: string[] = [];
    if (ph !== '2' && dur < BOSS.teleMinP1) w.push(`phase 1 : ${sec(dur)} < ${sec(BOSS.teleMinP1)} s`);
    if (ph !== '1' && dur / BOSS.p2Speed < BOSS.teleMinP2) w.push(`phase 2 : ${sec(dur)} ÷ ${sec(BOSS.p2Speed)} = ${sec(dur / BOSS.p2Speed)} < ${sec(BOSS.teleMinP2)} s`);
    L.push('', `## Nouveau pattern de boss — ${b.label}`, `- Nom : ${val('pname')} · Phase : ${ph === '1 et 2' ? '1 et 2 (phase: 0)' : ph}`,
      `- Télégraphe : ${val('ptele')} · durée ${sec(dur)} s${w.length ? ` ⚠ sous le minimum (${w.join(' ; ')}) : à rallonger` : ''}`,
      `- Phase active : ${val('pact')}`, `- Récupération (fenêtre de punition) : ${sec(+$('prec').value)} s`, `- Dégâts : ${val('pdmg')}`, '', 'Exigences :',
      `- Coroutine dans src/bosses/${b.id}.ts, ajoutée à ${b.boss!.name}.patterns ({ name, weight, phase: 0|1|2, far?, elevated? }) ; durées dans la constante en haut du fichier.`,
      "- Réutilise les outils de src/entities/Boss.ts (b.tele() pour le télégraphe, b.t(), b.tw(), b.temp(), b.hazard(), b.eyes('tele'|'off'|'on'), b.hitbox), les effets d'ArenaScene (sparks, debris, puffs, flashScreen) et les patterns existants du fichier comme modèles.",
      "- Structure : télégraphe (couleur danger, yeux 'tele') → actif → récupération (yeux 'off', boss ouvert).",
      '- Il apparaît tout seul dans le viewer : vérifie la frise (aucun ⚠).',
      '- Rappel : un coup retire toujours 1 PV au joueur (Player.hurt) ; des dégâts différents demandent de modifier Player.ts : dis-le-moi.');
  }
  L.push('', '## Ma demande', $('ask').value.trim() || '(voir ci-dessus)', '', '## Règles',
    '- Lis CLAUDE.md d\'abord.',
    "- Ne touche qu'aux fichiers de cette entité ; si un autre fichier est nécessaire, dis-le-moi.",
    '- Cyan lune = joueur et sorts ; rouge/magenta = DANGER uniquement (jamais PV, HUD ni déco).',
    `- Télégraphes ≥ ${sec(BOSS.teleMinP1)} s en phase 1 et ≥ ${sec(BOSS.teleMinP2)} s en phase 2.`,
    '- Rendu 480×270 pixel art (textures dessinées par code, contour 1 px, aucun fichier image/son).',
    `- Valeurs de gameplay dans src/config.ts ou src/bosses/*.ts ; valeurs d'art ${pj ? 'dans src/art/params/*.json' : "dans le code de dessin de l'entité (src/art/params/ n'existe pas encore)"}.`,
    '- Aucune donnée personnelle (nom, crédit, lien, chemin) dans le code, les assets, les params ni les textes.',
    '- Vérifie dans /?viewer puis dans le jeu ; bun run check et bun run build doivent passer.',
    '- Réponds en 5 lignes maximum.');
  return L.join('\n');
}
