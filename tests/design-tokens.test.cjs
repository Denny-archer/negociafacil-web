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

// Remove blocos `@media print { ... }` contando chaves.
function stripPrint(css) {
  let out = '';
  let i = 0;
  const re = /@media[^{]*print[^{]*\{/g;
  let m;
  while ((m = re.exec(css))) {
    out += css.slice(i, m.index);
    let depth = 1;
    let j = re.lastIndex;
    while (depth > 0 && j < css.length) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    i = j;
    re.lastIndex = j;
  }
  return out + css.slice(i);
}

// Valores de uma propriedade (apenas propriedades reais, não custom properties).
function propValues(css, prop) {
  const re = new RegExp('(?<![\\w-])' + prop + '\\s*:\\s*([^;}]+)', 'g');
  return [...css.matchAll(re)].map((m) => m[1].trim());
}
const fontSizes = (css) => propValues(css, 'font-size');
const fontWeights = (css) => propValues(css, 'font-weight');
const lineHeights = (css) => propValues(css, 'line-height');

// Arquivos com tipografia já migrada para tokens (Tarefas 4 e 5 acrescentam).
const TYPO_MIGRATED = ['src/styles.css', 'src/app-workspace.css', 'src/components/workspace.css', 'src/components/charts.css', 'src/components/document-actions.css'];

function bodyOf(css) {
  // ignora o bloco :root, que declara os próprios tokens
  return css.replace(/:root\s*\{[^}]*\}/g, '');
}

test('font-size usa tokens, fora de @media print', () => {
  for (const f of TYPO_MIGRATED) for (const v of fontSizes(bodyOf(stripPrint(readCss(f))))) assert.match(v, /^(var\(--fs-[a-z0-9]+\)|clamp\(var\(--fs-.+\)|inherit|0|100%)$/, `${f}: ${v}`);
});
test('font-weight usa tokens', () => {
  for (const f of TYPO_MIGRATED) for (const v of fontWeights(bodyOf(stripPrint(readCss(f))))) assert.match(v, /^(var\(--fw-[a-z]+\)|inherit)$/, `${f}: ${v}`);
});
test('line-height usa tokens (exceto 1, 0 e normal)', () => {
  for (const f of TYPO_MIGRATED) for (const v of lineHeights(bodyOf(stripPrint(readCss(f))))) assert.match(v, /^(var\(--lh-[a-z]+\)|1|0|normal|inherit)$/, `${f}: ${v}`);
});

test('fill de texto de gráfico usa token', () => {
  const css = readCss('src/components/charts.css');
  for (const sel of ['chart-axis', 'chart-month']) {
    const m = css.match(new RegExp('\\.' + sel + '\\s*\\{([^}]*)\\}'));
    assert.ok(m, sel);
    assert.match(m[1], /fill:\s*var\(--text-muted\)/, sel);
  }
});

// Seletores onde `color: #fff`/`white` é permitido: fundo navy ou de status escuro.
const WHITE_ALLOWED = ['.refresh-button', '.plan-number', '.button', '.toast', '.toast svg'];

// Regras (seletor, corpo) de um CSS já sem :root e sem @media print.
function rulesOf(css) {
  const out = [];
  for (const m of bodyOf(stripPrint(css)).matchAll(/([^{}@;]+)\{([^{}]*)\}/g)) {
    out.push([m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' '), m[2]]);
  }
  return out;
}

test('color usa tokens (var/inherit/currentColor), fora de :root e @media print', () => {
  for (const f of LOADED_CSS) {
    for (const [sel, body] of rulesOf(readCss(f))) {
      for (const raw of propValues(body, 'color')) {
        const v = raw.replace(/\s*!important$/, '');
        if (/^(var\(--[\w-]+\)|inherit|currentColor)$/.test(v)) continue;
        if (/^(#fff|#ffffff|white)$/i.test(v)) {
          assert.ok(sel.split(',').every((s) => WHITE_ALLOWED.includes(s.trim())), `${f}: ${sel} usa branco fora da lista`);
          continue;
        }
        assert.fail(`${f}: ${sel} { color: ${raw} }`);
      }
    }
  }
});

// Cor de texto sobre o fundo literal da própria regra (chips tingidos): >= 4.5 (texto) ou 3 (ícones --chart-*).
test('texto de status/neutro atinge contraste sobre o fundo literal da regra', () => {
  for (const f of LOADED_CSS) {
    for (const [sel, body] of rulesOf(readCss(f))) {
      const bgs = propValues(body, 'background').concat(propValues(body, 'background-color'));
      const bg = bgs.map((b) => b.match(/^#[0-9a-f]{6}$/i)).find(Boolean);
      const fg = propValues(body, 'color').map((v) => v.replace(/\s*!important$/, '').match(/^var\((--[\w-]+)\)$/)).find(Boolean);
      if (!bg || !fg) continue;
      const min = fg[1].startsWith('--chart-') ? 3 : 4.5;
      const ratio = contrast(tok(fg[1]), bg[0]);
      assert.ok(ratio >= min, `${f}: ${sel} ${fg[1]} sobre ${bg[0]} = ${ratio.toFixed(2)} (< ${min})`);
    }
  }
});

// Texto branco: cada fundo hex (inclusive paradas de gradiente) das regras permitidas, e variantes
// descendentes/:hover/:active, precisa dar >= 4.5:1 contra #fff.
test('fundos atrás de texto branco atingem 4.5:1 contra #fff', () => {
  const stops = (v) => [...v.matchAll(/#[0-9a-f]{6}\b/gi)].map((m) => m[0]);
  let checked = 0;
  for (const f of LOADED_CSS) {
    for (const [sel, body] of rulesOf(readCss(f))) {
      const hits = sel.split(',').some((s) => WHITE_ALLOWED.some((a) => new RegExp('(^|[\\s>])' + a.replace(/\./g, '\\.') + '(:[\\w-]+)*$').test(s.trim())));
      if (!hits) continue;
      for (const v of propValues(body, 'background').concat(propValues(body, 'background-color'))) {
        for (const hex of stops(v)) {
          checked++;
          assert.ok(contrast('#ffffff', hex) >= 4.5, `${f}: ${sel} fundo ${hex} = ${contrast('#ffffff', hex).toFixed(2)} contra branco`);
        }
      }
    }
  }
  assert.ok(checked >= 4, 'esperava fundos de .button/.refresh-button/.plan-number');
});

// Pares texto sobre fundo herdado do pai (o fundo não está na regra do texto).
const PARENT_PAIRS = [
  ['--success-text', '#f1f8f5'], // .ws-detail-values strong
  ['--success-text', '#f0f7f3'], // .ws-comparison-change span/strong
  ['--text-strong', '#e4eff9'], ['--text-secondary', '#e4eff9'], // .funnel-step
  ['--text-muted', '#f1f8f5'], ['--text-muted', '#f0f7f3'],
];
test('pares de texto sobre fundo do pai atingem 4.5:1', () => {
  for (const [fg, bg] of PARENT_PAIRS) assert.ok(contrast(tok(fg), bg) >= 4.5, `${fg} sobre ${bg}`);
});

test('nav-item hover/ativo usa --text-strong', () => {
  const css = readCss('src/styles.css');
  for (const sel of ['\\.nav-item:hover', '\\.nav-item\\.active', '\\.nav-item\\.active svg']) {
    const m = css.match(new RegExp(sel + '\\s*\\{([^}]*)\\}'));
    assert.ok(m, sel);
    assert.match(m[1], /color:\s*var\(--text-strong\)/, sel);
  }
});

module.exports = { LOADED_CSS, contrast, rootTokens, tok, rootBlock, readCss, stripPrint, fontSizes, fontWeights, lineHeights };
