/* global console, process */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = join(root, 'src');
const files = [];
function collect(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) collect(path);
    else if (/\.(css|tsx|ts)$/.test(entry.name)) files.push(path);
  }
}
collect(sourceRoot);
const violations = [];
const palette = ['#F7F5F1', '#FFFFFF', '#FAF8F3', '#292622', '#A98552', '#765744', '#8F9A7A', '#8B1830', '#D1A72C', '#81796F'];
for (const file of files) {
  if (file.endsWith('tokens.css')) continue;
  const content = readFileSync(file, 'utf8');
  for (const value of palette) if (content.toUpperCase().includes(value)) violations.push(`${file}: hardcoded palette value ${value}`);
}
const indexCss = readFileSync(join(sourceRoot, 'index.css'), 'utf8');
if (!indexCss.includes('@import "./styles/utilities.css";')) violations.push('src/index.css: missing shared utilities import');
if ((indexCss.match(/\.context-tab\s*\{/g) ?? []).length > 1) violations.push('src/index.css: duplicate navigation primitive');
if ((indexCss.match(/(?:^|})\s*\.semantic-status\s*\{/g) ?? []).length > 1) violations.push('src/index.css: duplicate status primitive');
if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`DS audit PASS: ${files.length} source files checked; token and shared-primitive checks are clean.`);
}
