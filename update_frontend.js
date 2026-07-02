const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'frontend/index.html');
let html = fs.readFileSync(filepath, 'utf8');

// --- 1. Update page title ---
html = html.replace('<title>Halo AI Chat</title>', '<title>Zanz_Codex - AI Chat</title>');

// --- 2. Add AI_NAME and DEFAULT_SYSTEM_PROMPT constants after GROQ_API ---
html = html.replace(
  "const GROQ_API = 'https://api.groq.com/openai/v1';",
  `const GROQ_API = 'https://api.groq.com/openai/v1';

// ── AI Name & Persona ────────────────────────────────────
const AI_NAME = 'Zanz_Codex';
const AI_DISPLAY_NAME = 'Zanz_Codex 🤖';

const DEFAULT_SYSTEM_PROMPT = \`Kamu adalah Zanz_Codex, asisten AI yang cerdas, ramah, dan membantu.
Kamu dibuat oleh izrai4103-lgtm.

Kepribadian:
- Ramah dan hangat seperti teman ngobrol
- Cerdas dan analitis dalam menjawab pertanyaan
- Jujur jika tidak tahu sesuatu
- Menggunakan bahasa Indonesia atau Inggris sesuai bahasa yang digunakan lawan bicara

Kemampuan:
- Menulis dan menjelaskan kode pemrograman
- Menjawab pertanyaan umum dan teknis
- Membantu menyelesaikan masalah
- Memberikan saran dan rekomendasi

Gaya bicara:
- Santai namun profesional
- Gunakan formatting Markdown untuk kode dan poin-poin penting
- Berikan penjelasan yang jelas dan terstruktur
- Jika diminta menulis kode, berikan contoh yang lengkap dan siap pakai\`;`
);

// --- 3. Add systemPrompt ref ---
html = html.replace(
  "const proxyUrl = ref('');\n    const groqApiKey = ref(EMBEDDED_GROQ_KEY);",
  `const proxyUrl = ref('');
    const systemPrompt = ref(localStorage.getItem('zanz_system_prompt') || DEFAULT_SYSTEM_PROMPT);
    const groqApiKey = ref(EMBEDDED_GROQ_KEY);`
);

// --- 4. Change title from "Halo AI" to "Zanz_Codex" in header ---
html = html.replace(
  '<h1 class="text-sm font-semibold gradient-text">Halo AI</h1>',
  '<h1 class="text-sm font-semibold gradient-text">Zanz_Codex</h1>'
);
html = html.replace(
  '<p class="text-[10px] text-gray-500 -mt-0.5">Powered by Groq</p>',
  '<p class="text-[10px] text-gray-500 -mt-0.5">Powered by Groq &bull; zanz_codex</p>'
);

// --- 5. Update welcome message ---
html = html.replace(
  '<h2 class="text-xl font-semibold gradient-text mb-1">Halo, apa kabar?</h2>',
  '<h2 class="text-xl font-semibold gradient-text mb-1">Halo, saya {{ AI_DISPLAY_NAME }}</h2>'
);
html = html.replace(
  `<p class="text-sm text-gray-500 max-w-md">I'm your AI assistant, powered by Groq. Ask me anything!</p>`,
  `<p class="text-sm text-gray-500 max-w-md">Saya AI assistant Zanz_Codex, siap membantu Anda! 🚀</p>`
);

// --- 6. Add system prompt & AI name to sendMessage ---
// Find where apiMessages is constructed and add system prompt
html = html.replace(
  `const apiMessages = messages.value
        .filter(m => m.role === 'user' || (m.role === 'assistant' && !m.streaming) || (m.role === 'assistant' && m.id === aid))
        .map(m => ({ role: m.role, content: m.content || '' }));`,
  `const apiMessages = [
        { role: 'system', content: systemPrompt.value },
        ...messages.value
          .filter(m => m.role === 'user' || (m.role === 'assistant' && !m.streaming) || (m.role === 'assistant' && m.id === aid))
          .map(m => ({ role: m.role, content: m.content || '' }))
      ];`
);

// --- 7. Update the bubble to show AI name for assistant messages ---
html = html.replace(
  `<div :class="[msg.role==='user' ? 'user-bubble max-w-[85%] sm:max-w-[70%]' : 'assistant-bubble max-w-[90%] sm:max-w-[75%]', 'px-4 py-3']">`,
  `<div :class="[msg.role==='user' ? 'user-bubble max-w-[85%] sm:max-w-[70%]' : 'assistant-bubble max-w-[90%] sm:max-w-[75%]', 'px-4 py-3']">
            <div v-if="msg.role==='assistant'" class="text-[11px] font-semibold text-indigo-400 mb-1">{{ AI_DISPLAY_NAME }}</div>`
);

// --- 8. Add system prompt editing in settings panel ---
html = html.replace(
  `            <input v-model="proxyUrl" type="url" placeholder="https://your-backend.onrender.com"`,
  `            <button @click="resetSystemPrompt" class="text-xs text-indigo-400 hover:text-indigo-300 mt-1 transition">Reset Default</button>
          </div>
          <div class="mb-3">
            <label class="text-xs font-medium text-gray-400 block mb-1.5">System Prompt / Persona</label>
            <textarea v-model="systemPrompt" rows="6" class="w-full bg-gray-800/50 text-gray-200 text-xs rounded-xl px-3 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 resize-y" placeholder="Custom system prompt..."></textarea>
          </div>
          <div class="mb-3">
            <label class="text-xs font-medium text-gray-400 block mb-1.5">Proxy URL (opsional)</label>
            <input v-model="proxyUrl" type="url" placeholder="https://your-backend.onrender.com"`
);

// --- 9. Update saveSettings to save systemPrompt ---
html = html.replace(
  `function saveSettings() {
      const key = apiKeyInput.value.trim();
      if (!key) return;
      groqApiKey.value = key;
      showSettings.value = false;
      error.value = '';
      if (key !== EMBEDDED_GROQ_KEY) {
        localStorage.setItem('halo_groq_key', key);
      }
      localStorage.setItem('halo_proxy_url', proxyUrl.value.trim());
    }`,
  `function saveSettings() {
      const key = apiKeyInput.value.trim();
      if (!key) return;
      groqApiKey.value = key;
      showSettings.value = false;
      error.value = '';
      if (key !== EMBEDDED_GROQ_KEY) {
        localStorage.setItem('halo_groq_key', key);
      }
      localStorage.setItem('halo_proxy_url', proxyUrl.value.trim());
      localStorage.setItem('zanz_system_prompt', systemPrompt.value);
    }

    function resetSystemPrompt() {
      systemPrompt.value = DEFAULT_SYSTEM_PROMPT;
    }`
);

// --- 10. Add resetSystemPrompt to return ---
html = html.replace(
  /(\s+)sidebarOpen, theme, showSettings, groqApiKey, apiKeyInput, proxyUrl,/,
  `$1sidebarOpen, theme, showSettings, groqApiKey, apiKeyInput, proxyUrl, systemPrompt, AI_DISPLAY_NAME,`
);
html = html.replace(
  /(\s+)renderMarkdown, autoResize, saveSettings,/,
  `$1renderMarkdown, autoResize, saveSettings, resetSystemPrompt,`
);

// Save
fs.writeFileSync(filepath, html);
console.log('✅ Frontend updated with AI name & persona');

// Sync to dist
const distPath = path.join(__dirname, 'dist/index.html');
fs.writeFileSync(distPath, html);
console.log('✅ Synced to dist/');
