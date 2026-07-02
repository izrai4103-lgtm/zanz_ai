const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'frontend/index.html');
let html = fs.readFileSync(filepath, 'utf8');

// Fix: Change const API_BASE to let API_BASE
html = html.replace('const API_BASE = (() => {', 'let API_BASE = (() => {');

// Also fix the saveApiUrl function to ensure it updates the variable
// First, let's verify the structure
if (html.includes('function saveApiUrl()') && html.includes('API_BASE = apiUrl.value;')) {
    console.log('✅ saveApiUrl function found with correct API_BASE assignment');
} else {
    console.log('⚠️ saveApiUrl function might have issues');
}

fs.writeFileSync(filepath, html);
console.log('✅ Fixed API_BASE reassignment issue');

// Copy to dist as well
const distPath = path.join(__dirname, 'dist/index.html');
fs.writeFileSync(distPath, html);
console.log('✅ Fixed file saved to dist/');
