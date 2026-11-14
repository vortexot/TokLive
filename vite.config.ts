import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

/**
 * O GitHub Pages publica a raiz da branch main, então o build gera o site na própria raiz do repositório
 * (index.html, assets/ e favicon.svg ao lado do código). A página de entrada do código-fonte se chama
 * app.html para não colidir com o index.html publicado; aqui ela é emitida com o nome index.html.
 */
function publishAsIndex(): Plugin {
  return {
    name: 'publish-as-index',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const page = bundle['app.html'];
      if (page && page.type === 'asset') {
        this.emitFile({ type: 'asset', fileName: 'index.html', source: page.source });
        delete bundle['app.html'];
      }
    },
  };
}

/** Em desenvolvimento, "/" abre a página de entrada do código-fonte em vez do index.html publicado. */
function devEntry(): Plugin {
  return {
    name: 'dev-entry',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/' || req.url === '/index.html') {
          res.statusCode = 302;
          res.setHeader('Location', '/app.html');
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  // Produção é o site no GitHub Pages, servido em /TokLive/. Desenvolvimento e testes usam "/".
  base: mode === 'production' ? '/TokLive/' : '/',
  plugins: [react(), publishAsIndex(), devEntry()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, open: '/app.html' },
  build: {
    outDir: '.',
    emptyOutDir: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: { input: 'app.html' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}));
