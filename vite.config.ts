import { defineConfig, type Plugin } from 'vite';

// Build: script classique (pas de module) pour que file:// fonctionne.
const classicScript = (): Plugin => ({
  name: 'classic-script',
  apply: 'build',
  renderChunk: (code) => code.replace(/https:\/\/phaser\.io\/?/g, ''),
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/ crossorigin/g, ''),
  },
});

// Le viewer (src/viewer/) est un outil de dev : au build, ses modules sont remplacés par un module vide.
const noViewer = (): Plugin => ({
  name: 'no-viewer',
  apply: 'build',
  enforce: 'pre',
  load: (id) => (id.includes('/src/viewer/') ? 'export {};' : null),
});

export default defineConfig({
  base: './',
  esbuild: { legalComments: 'none' },
  plugins: [noViewer(), classicScript()],
  build: {
    sourcemap: false,
    modulePreload: false,
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'game.js' },
    },
  },
});
