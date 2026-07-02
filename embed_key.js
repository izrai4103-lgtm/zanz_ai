const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'frontend/index.html');
let html = fs.readFileSync(filepath, 'utf8');

// 1) Replace the groqApiKey ref to embed the Groq API key
const oldRefPattern = `    const groqApiKey = ref(localStorage.getItem('halo_groq_key') || '');\n    const apiKeyInput = ref(groqApiKey.value);\n    const proxyUrl = ref(localStorage.getItem('halo_proxy_url') || '');`;
const newRefPattern = `    const EMBEDDED_GROQ_KEY = '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';\n    const proxyUrl = ref('');\n    const groqApiKey = ref(EMBEDDED_GROQ_KEY);\n    const apiKeyInput = ref(EMBEDDED_GROQ_KEY);`;

if (html.includes(oldRefPattern)) {
  html = html.replace(oldRefPattern, newRefPattern);
  console.log('✅ Embedded Groq API key');
} else {
  console.log('⚠️ Pattern not found, trying alternative');
}

// 2) Replace saveApiKey function
const oldSaveKey = `    function saveApiKey() {
      const key = apiKeyInput.value.trim();
      if (!key) return;
      groqApiKey.value = key;
      localStorage.setItem('halo_groq_key', key);
      // Also save proxy URL
      localStorage.setItem('halo_proxy_url', proxyUrl.value.trim());
      showSettings.value = false;
      error.value = '';
    }`;

const newSaveKey = `    function saveSettings() {
      const key = apiKeyInput.value.trim();
      if (!key) return;
      groqApiKey.value = key;
      showSettings.value = false;
      error.value = '';
      if (key !== EMBEDDED_GROQ_KEY) {
        localStorage.setItem('halo_groq_key', key);
      }
      localStorage.setItem('halo_proxy_url', proxyUrl.value.trim());
    }`;

if (html.includes(oldSaveKey)) {
  html = html.replace(oldSaveKey, newSaveKey);
  console.log('✅ Updated save function');
} else {
  console.log('⚠️ saveApiKey pattern not found exactly, trying loose');
}

// 3) Replace saveApiKey reference in return
html = html.replace(/(\s+)saveApiKey,/g, '$1saveSettings,');
console.log('✅ Updated return reference');

// 4) Replace @click="saveApiKey" with @click="saveSettings"
html = html.replace(/@click="saveApiKey"/g, '@click="saveSettings"');
console.log('✅ Updated button handler');

// 5) Write the result
fs.writeFileSync(filepath, html);
console.log('✅ Frontend updated');

// 6) Sync to dist
const distPath = path.join(__dirname, 'dist/index.html');
fs.writeFileSync(distPath, html);
console.log('✅ Synced to dist/');
