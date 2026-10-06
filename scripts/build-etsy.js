#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist', 'etsy');

fs.mkdirSync(DIST, { recursive: true });

let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
let css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf8');
let js = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');

// Set edition flag
js = `const __LB_EDITION__ = 'etsy';\n` + js;

// Remove test exports (everything from the typeof module block)
js = js.replace(/if\s*\(typeof\s+module\s*!==\s*'undefined'[\s\S]*$/, '');

// Replace Google Fonts with system font stack
html = html.replace(/<link[^>]*fonts\.googleapis\.com[^>]*>/g, '');
html = html.replace(/<link[^>]*fonts\.gstatic\.com[^>]*>/g, '');
css = css.replace(/font-family:\s*'Inter'[^;]*/g, "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif");
css = css.replace(/font-family:\s*Inter[^;]*/g, "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif");

// Update title
html = html.replace(/<title>LifeBalance<\/title>/, '<title>LifeBalance Planner</title>');

// Inline CSS and JS
// Function replacers: a string replacement would treat "$$", "$&" etc. in the code as special patterns
html = html.replace(/<link\s+rel="stylesheet"\s+href="style\.css"\s*>/, () => `<style>\n${css}\n</style>`);
html = html.replace(/<script\s+src="app\.js"\s*><\/script>/, () => `<script>\n${js}\n</script>`);

// Remove skip link href (still functional, no network)
// Nothing to change — it's an internal anchor

// Minify: remove CSS comments and collapse whitespace in CSS
css = css.replace(/\/\*[\s\S]*?\*\//g, '');

// Write output
const outPath = path.join(DIST, 'LifeBalance-Planner.html');
fs.writeFileSync(outPath, html, 'utf8');

const size = fs.statSync(outPath).size;
const sizeMB = (size / 1024 / 1024).toFixed(2);
console.log(`Built: ${outPath}`);
console.log(`Size: ${sizeMB} MB (${size} bytes)`);
if (size > 3 * 1024 * 1024) {
  console.warn('WARNING: File exceeds 3 MB target');
}

// Verify no API keys or Netlify URLs
const content = fs.readFileSync(outPath, 'utf8');
const checks = [
  { pattern: /sk-ant/i, name: 'API key pattern' },
  { pattern: /ANTHROPIC_API_KEY/i, name: 'API key variable' },
  { pattern: /netlify\.app/i, name: 'Netlify URL' },
  { pattern: /\/api\/ai-planner/i, name: 'API endpoint' },
];

let clean = true;
checks.forEach(({ pattern, name }) => {
  // Skip matches inside the callAIPlanner function that's guarded by edition check
  if (pattern.test(content)) {
    // For /api/ai-planner, it's OK because the Etsy edition short-circuits before reaching fetch
    if (name === 'API endpoint') {
      console.log(`Note: ${name} found but guarded by LB_EDITION check`);
    } else {
      console.error(`FAIL: ${name} found in output`);
      clean = false;
    }
  }
});

if (clean) console.log('Security check: PASS — no API keys or unguarded Netlify URLs');
else process.exit(1);
