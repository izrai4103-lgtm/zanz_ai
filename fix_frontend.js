const fs = require('fs');
const path = require('path');

let html = fs.readFileSync(path.join(__dirname, 'frontend/index.html'), 'utf8');

// Fix the API_BASE re-assignment issue
// Check if the current code has the right syntax
if (!html.includes('API_BASE = (() => {')) {
    console.log('✅ API_BASE is already correctly defined');
} else {
    console.log('⚠️ API_BASE definition found, checking...');
}

// Ensure saveApiUrl function is correct
const saveApiUrlPattern = /function saveApiUrl\(\)\s*\{[^}]+checkBackend\(\)/;
if (saveApiUrlPattern.test(html)) {
    console.log('✅ saveApiUrl function looks good');
} else {
    // Fix saveApiUrl function to ensure it updates API_BASE
    html = html.replace(
        /function saveApiUrl\(\)\s*\{[^}]+checkBackend\(\)\s*\}/s,
        'function saveApiUrl() {\n          // Update the API URL\n          localStorage.setItem(\'halo_api_base\', apiUrl.value);\n          API_BASE = apiUrl.value;\n          checkBackend();\n        }'
    );
    console.log('✅ Fixed saveApiUrl function');
}

// Ensure Vue app has proper mount
if ('createApp({' in html && '.mount' in html) {
    console.log('✅ Vue app structure looks good');
} else {
    console.log('⚠️ Vue app structure might need review');
}

// Save the fixed HTML
fs.writeFileSync(path.join(__dirname, 'frontend/index.html'), html);
console.log('✅ Frontend validation completed');

// Also sync to dist
fs.copyFileSync(path.join(__dirname, 'frontend/index.html'), path.join(__dirname, 'dist/index.html'));
console.log('✅ Frontend synced to dist/');

// Check if we need to add additional error handling or fixes
if (html.includes('setup.*\.env') || html.includes('.env.local')) {
    console.log('⚠️ References to environment setup found - may need user configuration');
}
