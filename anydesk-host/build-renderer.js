const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// 1. Try to read from local .env file
let signalingUrl = 'http://localhost:3001';
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/SIGNALING_URL\s*=\s*(.*)/);
    if (match && match[1]) {
      signalingUrl = match[1].trim().replace(/['"]/g, '');
    }
  }
} catch (e) {
  console.warn('[Build Renderer] Warning: Could not parse .env file:', e.message);
}

// 2. Allow process.env override (terminal variables)
if (process.env.SIGNALING_URL) {
  signalingUrl = process.env.SIGNALING_URL.trim();
}

console.log(`[Build Renderer] Baking in SIGNALING_URL = "${signalingUrl}"`);

esbuild.build({
  entryPoints: ['src/renderer/hidden.ts'],
  bundle: true,
  outfile: 'dist/renderer/hidden.js',
  platform: 'browser',
  define: {
    'process.env.SIGNALING_URL': JSON.stringify(signalingUrl)
  }
}).catch((err) => {
  console.error('[Build Renderer] esbuild failed:', err);
  process.exit(1);
});
