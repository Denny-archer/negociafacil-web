'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Os 5 arquivos CSS carregados pela aplicação (escopo das regras de design).
const LOADED_CSS = [
  'src/styles.css',
  'src/app-workspace.css',
  'src/components/workspace.css',
  'src/components/charts.css',
  'src/components/document-actions.css',
];

function readCss(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

// Primeiro bloco `:root { ... }` de src/styles.css.
function rootBlock() {
  const match = readCss('src/styles.css').match(/:root\s*\{([^}]*)\}/);
  assert.ok(match, ':root não encontrado em src/styles.css');
  return match[1];
}

// Tokens do :root cujo nome casa com o padrão (ex.: /^--fs-/).
function rootTokens(pattern) {
  const tokens = {};
  for (const m of rootBlock().matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    if (pattern.test(m[1])) tokens[m[1]] = m[2].trim();
  }
  return tokens;
}

// Valor de um token; resolve var(--outro) e aceita hex literal.
function tok(name) {
  if (/^#/.test(name)) return name;
  const value = rootTokens(/.*/)[name];
  assert.ok(value, `token ${name} ausente no :root`);
  const alias = value.match(/^var\((--[\w-]+)\)$/);
  return alias ? tok(alias[1]) : value;
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.replace(/./g, (c) => c + c) : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Razão de contraste WCAG entre duas cores hex.
function contrast(hexA, hexB) {
  const [a, b] = [luminance(hexA), luminance(hexB)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

const TEXT_TOKENS = ['--text-strong', '--text-secondary', '--text-muted', '--success-text', '--danger-text', '--warning-text', '--info-text', '--accent-text'];
const SURFACES = ['--surface-page', '--surface-card', '--surface-subtle', '#eaf6ef', '#f3effb'];
const TEXT_PAIRS = TEXT_TOKENS.flatMap((fg) => SURFACES.map((bg) => [fg, bg]));

test('root define a escala tipográfica exata', () => {
  assert.deepEqual(rootTokens(/^--fs-/), { '--fs-2xs': '0.75rem', '--fs-xs': '0.8125rem', '--fs-sm': '0.875rem', '--fs-md': '1rem', '--fs-lg': '1.25rem', '--fs-xl': '1.5rem', '--fs-2xl': '2rem' });
});
test('root não fixa font-size em px', () => assert.doesNotMatch(rootBlock(), /font-size:\s*\d+px/));
test('pares de texto atingem 4.5:1', () => {
  for (const [fg, bg] of TEXT_PAIRS) assert.ok(contrast(tok(fg), tok(bg)) >= 4.5, `${fg} sobre ${bg}`);
});
test('marcas de gráfico atingem 3:1 sobre o card', () => {
  for (const t of ['--chart-blue', '--chart-mint', '--chart-rose', '--chart-gold', '--navy']) assert.ok(contrast(tok(t), tok('--surface-card')) >= 3, t);
});
test('modules.css não existe', () => assert.equal(fs.existsSync(path.join(ROOT, 'src/components/modules.css')), false));

module.exports = { LOADED_CSS, contrast, rootTokens, tok, rootBlock, readCss };
