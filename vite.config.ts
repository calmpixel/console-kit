import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { setupVitePlugins } from './build/plugins';
import { createViteProxy, getBuildTime } from './build/config';

export default defineConfig(configEnv => {
  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;

  return {
    base: viteEnv.VITE_BASE_URL,
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `@use "@/styles/scss/global.scss" as *;`
        }
      }
    },
    plugins: setupVitePlugins(viteEnv, buildTime),
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    server: {
      host: '0.0.0.0',
      port: 9527,
      open: true,
      proxy: {
        ...createViteProxy(viteEnv, enableProxy),
        '/api': {
          target: 'http://127.0.0.1:18080',
          changeOrigin: true,
          // Long-lived SSE: do not idle-cut the proxy socket.
          timeout: 0,
          proxyTimeout: 0,
          configure: (proxy: { on: (event: string, fn: (...args: any[]) => void) => void }) => {
            proxy.on(
              'proxyRes',
              (
                proxyRes: { headers: Record<string, unknown> },
                req: { url?: string },
                res: { setHeader: (k: string, v: string) => void }
              ) => {
                const ct = String(proxyRes.headers['content-type'] || '');
                const url = String(req.url || '');
                if (ct.includes('text/event-stream') || url.includes('/stream')) {
                  // Disable intermediary buffering so EventSource gets frames immediately.
                  res.setHeader('Cache-Control', 'no-cache, no-transform');
                  res.setHeader('X-Accel-Buffering', 'no');
                  delete proxyRes.headers['content-encoding'];
                }
              }
            );
          }
        },
        '/ui': {
          target: 'http://127.0.0.1:18080',
          changeOrigin: true
        },
        '/mock-ui': {
          target: 'http://127.0.0.1:18080',
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 9725
    },
    build: {
      outDir: fileURLToPath(new URL('../web/dist', import.meta.url)),
      emptyOutDir: true,
      reportCompressedSize: false,
      sourcemap: viteEnv.VITE_SOURCE_MAP === 'Y',
      commonjsOptions: {
        ignoreTryCatch: false
      }
    }
  };
});
