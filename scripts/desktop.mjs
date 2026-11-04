// Exports bureau (Linux tar.gz, Windows zip, macOS zip) : Electron officiel + le jeu de dist/ dans resources/app.
// Les archives Electron sont téléchargées une fois dans .electron/ , décompressées, complétées du jeu puis réarchivées.
import { $ } from 'bun';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, chmodSync, existsSync, readdirSync, renameSync } from 'fs';

const V = '45.2.3';
const OUT = 'exports';
const T = '.electron';
mkdirSync(OUT, { recursive: true });
mkdirSync(T, { recursive: true });

const MAIN = `const { app, BrowserWindow, Menu, nativeImage, session } = require('electron');
const fs = require('fs'), path = require('path');
app.whenReady().then(() => {
  // Aucun appel réseau : tout ce qui n'est pas local est bloqué.
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => cb({ cancel: !/^(file|data|blob):/.test(d.url) }));
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  const page = path.join(__dirname, 'index.html');
  const ico = fs.readFileSync(page, 'utf8').match(/data:image\\/png;base64,[A-Za-z0-9+/=]+/);
  const win = new BrowserWindow({
    width: 1280, height: 720, useContentSize: true, backgroundColor: '#0b0a14', title: 'Ashenborn', autoHideMenuBar: true,
    icon: ico ? nativeImage.createFromDataURL(ico[0]) : undefined,
    webPreferences: { devTools: false },
  });
  win.setAspectRatio(16 / 9); // fenêtre redimensionnée sans bandes noires
  win.loadFile(page);
});
app.on('window-all-closed', () => app.quit());
`;
const PKG = JSON.stringify({ name: 'ashenborn', productName: 'Ashenborn', version: '1.0.0', main: 'main.js' });

async function electron(plat) {
  const f = `${T}/electron-v${V}-${plat}.zip`;
  if (!existsSync(f)) {
    console.log(`téléchargement Electron ${plat}…`);
    const r = await fetch(`https://github.com/electron/electron/releases/download/v${V}/electron-v${V}-${plat}.zip`);
    if (!r.ok) throw new Error(`${plat} : HTTP ${r.status}`);
    await Bun.write(f, r);
  }
  return f;
}

/** Électron décompressé (droits et liens conservés par unzip) dans .electron/<cible>/Ashenborn, puis le jeu dans `app`. */
async function stage(plat, appDir) {
  const root = `${T}/${plat}`;
  rmSync(root, { recursive: true, force: true });
  mkdirSync(`${root}/Ashenborn`, { recursive: true });
  await $`unzip -q ${await electron(plat)} -d ${root}/Ashenborn`;
  const r = `${root}/Ashenborn`;
  // Langues de Chromium inutiles (jeu en français).
  if (existsSync(`${r}/locales`)) for (const f of readdirSync(`${r}/locales`)) if (!/^(fr|en-US)\.pak$/.test(f)) rmSync(`${r}/locales/${f}`);
  rmSync(`${r}/${appDir.replace(/app$/, 'default_app.asar')}`, { force: true });
  mkdirSync(`${r}/${appDir}`, { recursive: true });
  for (const n of ['index.html', 'game.js']) copyFileSync(`dist/${n}`, `${r}/${appDir}/${n}`);
  writeFileSync(`${r}/${appDir}/main.js`, MAIN);
  writeFileSync(`${r}/${appDir}/package.json`, PKG);
  return { root, r };
}

// Linux : tar.gz (garde le droit d'exécution). Lanceur ./ashenborn (sans bac à sable SUID, impossible sans droits admin).
{
  const { root, r } = await stage('linux-x64', 'resources/app');
  renameSync(`${r}/electron`, `${r}/ashenborn.bin`);
  writeFileSync(`${r}/ashenborn`, '#!/bin/sh\ncd "$(dirname "$(readlink -f "$0")")" && exec ./ashenborn.bin --no-sandbox "$@"\n');
  chmodSync(`${r}/ashenborn`, 0o755);
  const o = `${OUT}/ashenborn-linux.tar.gz`;
  rmSync(o, { force: true });
  await $`tar -czf ${o} --owner=0 --group=0 --numeric-owner -C ${root} Ashenborn`;
  console.log(o);
}

// Windows : zip, Ashenborn\Ashenborn.exe.
{
  const { root, r } = await stage('win32-x64', 'resources/app');
  renameSync(`${r}/electron.exe`, `${r}/Ashenborn.exe`);
  const o = `${OUT}/ashenborn-windows.zip`;
  rmSync(o, { force: true });
  await $`bsdtar --format zip -cf ${o} --uid 0 --gid 0 -C ${root} Ashenborn`;
  console.log(o);
}

// macOS (Apple Silicon) : zip, Ashenborn/Ashenborn.app (liens symboliques du framework conservés).
{
  const { root, r } = await stage('darwin-arm64', 'Electron.app/Contents/Resources/app');
  renameSync(`${r}/Electron.app`, `${r}/Ashenborn.app`);
  const o = `${OUT}/ashenborn-mac.zip`;
  rmSync(o, { force: true });
  await $`bsdtar --format zip -cf ${o} --uid 0 --gid 0 -C ${root} Ashenborn`;
  console.log(o);
}
