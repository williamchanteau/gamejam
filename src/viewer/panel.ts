// DEV uniquement : panneau HTML du viewer (sans librairie).
import { BOSS } from '../config';
import { V, ENTITIES, animsOf, type Seg } from './anims';
import type { ViewerScene } from './ViewerScene';

let sc: ViewerScene;
let root: HTMLDivElement | null = null;
const $ = <T extends HTMLElement>(id: string) => root!.querySelector('#v-' + id) as T;
const fmt = (n: number) => (n / 60).toFixed(2).replace('.', ',');
const COLS: Record<Seg['k'], string> = { t: '#ff2a5a', a: '#ff8a2a', r: '#4a6a9a', n: '#3a3a46' };
const NAMES: Record<Seg['k'], string> = { t: 'TÉLÉGRAPHE', a: 'ACTIF', r: 'RÉCUP', n: 'NEUTRE' };
const CHECKS: [string, string][] = [['loop', 'Boucle'], ['follow', 'Caméra suit'], ['hit', 'Hitbox'], ['hurt', 'Hurtbox'], ['pivot', 'Pivots'], ['arena', "Fond d'arène"], ['sound', 'Son']];
const flags = V as unknown as Record<string, boolean>, show = V.show as Record<string, boolean>;
const getF = (k: string) => (k in show ? show[k] : flags[k]);
const setF = (k: string, v: boolean) => { if (k in show) show[k] = v; else flags[k] = v; };

const CSS = `#viewer{position:fixed;left:0;top:0;width:300px;height:100%;box-sizing:border-box;overflow:auto;padding:10px;background:#16151c;color:#d8d8e0;font:12px/1.4 monospace;display:flex;flex-direction:column;gap:8px;z-index:10}
#viewer button,#viewer select{background:#2a2934;color:inherit;border:1px solid #48475a;padding:3px 7px;font:inherit;cursor:pointer}
#viewer button.on{background:#7ff6ff;color:#000}#viewer .row{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
#viewer .checks{display:grid;grid-template-columns:1fr 1fr}#v-frise{position:relative;display:flex;height:16px;background:#000}
#v-frise div{height:100%}#v-head{position:absolute;top:-3px;bottom:-3px;width:2px;background:#fff}#v-warn{color:#ff5a7a;font-weight:bold}`;

export function buildPanel(s: ViewerScene) {
  sc = s;
  if (root) return;
  root = document.createElement('div');
  root.id = 'viewer';
  root.innerHTML = `<style>${CSS}</style><b>VIEWER (DEV)</b>
<label>Entité <select id="v-ent">${ENTITIES.map((e, i) => `<option value="${i}">${e.label}</option>`).join('')}</select></label>
<div class="row" id="v-phase">Phase <button data-p="1">1</button><button data-p="2">2</button></div>
<div class="row" id="v-anims"></div>
<div class="row"><button id="v-first" title="Début">|◀◀</button><button id="v-prev" title="Image précédente">◀|</button><button id="v-play"></button><button id="v-next" title="Image suivante">|▶</button></div>
<label class="row">Vitesse <input id="v-speed" type="range" min="0.1" max="2" step="0.1" value="${V.speed}"><span id="v-speedv"></span></label>
<label>Zoom <select id="v-zoom">${[1, 2, 3, 4, 6, 8].map((z) => `<option value="${z}"${z === V.zoom ? ' selected' : ''}>${z}×</option>`).join('')}</select></label>
<div class="checks">${CHECKS.map(([k, l]) => `<label><input type="checkbox" data-k="${k}"${getF(k) ? ' checked' : ''}> ${l}</label>`).join('')}</div>
<div id="v-info"></div><div id="v-frise"></div><div id="v-segs"></div><div id="v-warn"></div>`;
  document.body.appendChild(root);
  document.getElementById('game')!.style.cssText = 'position:fixed;left:300px;top:0;width:calc(100% - 300px);height:100%';
  s.scale.refresh();

  $<HTMLSelectElement>('ent').onchange = (e) => { V.ent = +(e.target as HTMLSelectElement).value; V.anim = 0;
    V.zoom = ENTITIES[V.ent].boss ? 1 : 4; $<HTMLSelectElement>('zoom').value = String(V.zoom);
    sc.reload(); };
  $('phase').onclick = (e) => { const p = (e.target as HTMLElement).dataset.p; if (p) { V.phase = +p as 1 | 2; sc.reload(); } };
  $('anims').onclick = (e) => { const i = (e.target as HTMLElement).dataset.i; if (i) { V.anim = +i; sc.reload(); } };
  $('first').onclick = () => sc.seek(0);
  $('prev').onclick = () => sc.prev();
  $('next').onclick = () => sc.next();
  $('play').onclick = () => {
    if (!V.paused) { V.paused = true; return; }
    V.paused = false;
    if (V.frame >= V.total) sc.seek(0);
  };
  $<HTMLInputElement>('speed').oninput = (e) => { V.speed = +(e.target as HTMLInputElement).value; };
  $<HTMLSelectElement>('zoom').onchange = (e) => { V.zoom = +(e.target as HTMLSelectElement).value; };
  root.querySelector('.checks')!.addEventListener('change', (e) => {
    const c = e.target as HTMLInputElement;
    setF(c.dataset.k!, c.checked);
    if (c.dataset.k === 'arena') sc.seek(V.frame);
  });
  // Espace sur un bouton focalisé ferait aussi sauter le joueur : on rend le focus.
  root.addEventListener('click', (e) => { if (e.target instanceof HTMLButtonElement) e.target.blur(); });
}

/** Parties qui changent avec l'entité / l'animation (après chaque (re)création de la scène). */
export function renderPanel() {
  const e = ENTITIES[V.ent], anims = animsOf(e), anim = anims[V.anim];
  $<HTMLSelectElement>('ent').value = String(V.ent);
  $('phase').style.display = e.boss ? '' : 'none';
  $('phase').querySelectorAll('button').forEach((b) => b.classList.toggle('on', +b.dataset.p! === V.phase));
  $('anims').innerHTML = anims.map((a, i) => `<button data-i="${i}" class="${i === V.anim ? 'on' : ''}">${a.label}</button>`).join('');
  const show = !!e.boss;
  $('frise').style.display = $('segs').style.display = show ? '' : 'none';
  $('frise').innerHTML = V.segs.map((s) => `<div title="${NAMES[s.k]} ${fmt(s.n)} s" style="flex:${s.n};background:${COLS[s.k]}"></div>`).join('') + '<div id="v-head"></div>';
  $('segs').innerHTML = V.segs.filter((s) => s.n > 1).map((s) => `<span style="color:${COLS[s.k]}">■</span> ${NAMES[s.k]} ${fmt(s.n)} s`).join('<br>');
  // Télégraphe trop court : seulement ceux suivis d'une phase active.
  const min = V.phase === 2 ? BOSS.teleMinP2 : BOSS.teleMinP1, warn: string[] = [];
  const sec = (x: number) => x.toFixed(2).replace('.', ',');
  if (anim?.pattern) {
    for (const t of V.teles) if (t.req < min - 1e-6) warn.push(`⚠ TÉLÉGRAPHE DEMANDÉ ${sec(t.req)} s < ${sec(min)} s (P${V.phase}) — RALLONGÉ PAR LE MOTEUR`);
    // Télégraphe mesuré trop court (pattern qui n'utiliserait pas b.tele()).
    V.segs.forEach((s, i) => {
      if (s.k === 't' && V.segs[i + 1]?.k === 'a' && s.n < Math.round(min * 60) - 1)
        warn.push(`⚠ TÉLÉGRAPHE MESURÉ ${fmt(s.n)} s < ${sec(min)} s (P${V.phase})`);
    });
  }
  $('warn').innerHTML = warn.join('<br>');
}

/** Chaque image : compteur, bouton lecture, tête de lecture. */
export function tickPanel() {
  if (!root) return;
  $('info').textContent = `IMAGE ${V.frame} / ${V.total} · ${fmt(V.frame)} s / ${fmt(V.total)} s`;
  $('play').textContent = V.paused ? '▶' : 'II';
  $('speedv').textContent = `${V.speed.toFixed(1)}×`;
  const h = root.querySelector('#v-head') as HTMLElement | null;
  if (h) h.style.left = `${(100 * V.frame) / Math.max(1, V.total)}%`;
}
