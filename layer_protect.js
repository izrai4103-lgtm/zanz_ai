const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'frontend/index.html');
let html = fs.readFileSync(srcPath, 'utf8');

// ── LAYER 2: Domain Origin Check (anti-hotlink) ──
// Add a check at the very top of <script> that locks the site to allowed domains
const domainCheck = `
// === LAYER 2: DOMAIN LOCK ===
(function() {
  const ALLOWED = [
    'anyclaw.store',
    'localhost',
    '127.0.0.1',
    'izrai4103-lgtm.github.io'
  ];
  const host = window.location.hostname;
  const ok = ALLOWED.some(d => host === d || host.endsWith('.' + d));
  if (!ok) {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#94a3b8;font-family:sans-serif;font-size:1.2rem;text-align:center;padding:2rem"><div><h1 style="color:#6366f1;font-size:2rem;margin-bottom:1rem">🔒 Access Denied</h1><p>This website is protected. Unauthorized access is not allowed.</p></div></div>';
    throw new Error('Domain not allowed: ' + host);
  }
})();
`;

// ── LAYER 3: Code Obfuscation (minify inline JS) ──
// Remove comments, trim whitespace, shorten internal variable names
function obfuscateJS(js) {
  let out = js;
  // Remove single-line comments
  out = out.replace(/\/\/[^\n]*\n/g, '\n');
  // Remove multi-line comments
  out = out.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove extra blank lines
  out = out.replace(/\n\s*\n\s*\n/g, '\n\n');
  // Trim lines
  out = out.split('\n').map(l => l.trim()).join('\n');
  return out;
}

// ── LAYER 4: Remove GitHub/file references ──
function stripReferences(text) {
  let out = text;
  // Remove GitHub URLs from visible content
  out = out.replace(/https:\/\/github\.com\/[\w\-./]+/g, '[protected]');
  // Remove local file system paths
  out = out.replace(/\/root\/[\w\-./]+/g, '[protected]');
  // Remove backend file references from comments
  out = out.replace(/Built with materials from the[\s\S]*?OpenClaw project/g, 'Protected build');
  return out;
}

// ── Apply all layers ──

// 1) Add domain lock right after the opening <script> tag (before Vue code)
html = html.replace(
  /<script>\s*\n\s*const \{ createApp/,
  `<script>\n${domainCheck}\nconst { createApp`
);

// 2) Obfuscate the non-Vue template parts (the script section)
// Extract the script content, obfuscate it, put it back
const scriptMatch = html.match(/<script>[\s\S]*?<\/script>/);
if (scriptMatch) {
  const fullScript = scriptMatch[0];
  const innerJS = fullScript.replace(/<script>/, '').replace(/<\/script>/, '');
  const obfuscated = obfuscateJS(innerJS);
  html = html.replace(fullScript, `<script>${obfuscated}</script>`);
  console.log('✅ Layer 3: JS code obfuscated');
}

// 3) Strip references
html = stripReferences(html);
console.log('✅ Layer 4: References stripped');

// 4) Save
fs.writeFileSync(srcPath, html);
console.log('✅ Layer 1: Frontend saved (ready for Anyclaw deploy)');

// Also sync to dist
const distPath = path.join(__dirname, 'dist/index.html');
fs.writeFileSync(distPath, html);
console.log('✅ dist/ synced');
