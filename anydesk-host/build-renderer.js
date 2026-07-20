const esbuild = require('esbuild');
const signalingUrl = process.env.SIGNALING_URL || 'http://localhost:3001';

console.log(`[Build Renderer] Baking in SIGNALING_URL = "${signalingUrl}"`);

esbuild.build({
  entryPoints: ['src/renderer/hidden.ts'],
  bundle: true,
  outfile: 'dist/renderer/hidden.js',
  platform: 'browser',
  define: {
    'process.env.SIGNALING_URL': JSON.stringify(signalingUrl.trim())
  }
}).catch((err) => {
  console.error('[Build Renderer] esbuild failed:', err);
  process.exit(1);
});
