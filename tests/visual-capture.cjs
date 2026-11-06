// Captura de telas por view e viewport, com verificações de layout.
// Uso: node tests/visual-capture.cjs <dist> <saida> [--font-scale=1.25] [--allow-overflow]
const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith('--'));
const [distDir, outDir] = args.filter((a) => !a.startsWith('--'));
if (!distDir || !outDir) {
  console.error('Uso: npm run capture -- <dist> <saida> [--font-scale=1.25] [--allow-overflow]');
  process.exit(1);
}
const scaleFlag = flags.find((f) => f.startsWith('--font-scale='));
const fontScale = scaleFlag ? Number(scaleFlag.split('=')[1]) : null;
if (scaleFlag && !(fontScale > 0)) {
  console.error('Valor inválido em --font-scale');
  process.exit(1);
}
// Na linha de base as violações de estouro são apenas registradas.
const allowOverflow = flags.includes('--allow-overflow');

const root = path.resolve(distDir);
const out = path.resolve(outDir);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const views = [
  'overview',
  'delinquency',
  'collection',
  'negotiation',
  'active-debt',
  'protest',
  'payments',
  'demands',
  'reports',
  'settings',
];
const viewports = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};
const url = 'http://capture.local/';

async function serve(page) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route(url + '**', async (route) => {
    const name = new URL(route.request().url()).pathname;
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404 });
    await route.fulfill({ status: 200, contentType: mime[path.extname(file)], path: file });
  });
}

let navigationSequence = 0;
async function openView(page, route) {
  await page.goto(url + '?qa=' + ++navigationSequence + '#' + route, { waitUntil: 'networkidle' });
  await page.locator('.loading-strip').waitFor({ state: 'hidden' });
  await page.locator('.nav-item.active').waitFor();
  if (fontScale) {
    await page.evaluate((s) => {
      document.documentElement.style.fontSize = s * 100 + '%';
    }, fontScale);
  }
}

// Cada verificação recebe a página e devolve uma lista de mensagens de violação.
// Para novas verificações (ex.: estouro em .ws-metric), basta acrescentar um item.
const checks = [
  {
    name: 'scrollWidth',
    run: (page) =>
      page.evaluate(() => {
        const { scrollWidth } = document.documentElement;
        return scrollWidth > window.innerWidth
          ? ['scrollWidth ' + scrollWidth + ' > innerWidth ' + window.innerWidth]
          : [];
      }),
  },
  {
    // O botão da entidade não pode passar da célula (a coluna vizinha o cobriria e cortaria o texto).
    name: 'ws-entity',
    run: (page) =>
      page.evaluate(() =>
        [...document.querySelectorAll('.ws-entity-button')].flatMap((el, i) => {
          const cell = el.closest('td');
          if (!cell) return [];
          const over = el.getBoundingClientRect().right - cell.getBoundingClientRect().right;
          return over > 0.5 || el.scrollWidth > el.clientWidth
            ? ['.ws-entity-button #' + (i + 1) + ' ultrapassa a célula em ' + Math.round(over) + 'px']
            : [];
        }),
      ),
  },
  {
    // Cartões de indicadores (.ws-metric, workspace.css): nem o cartão nem o valor podem estourar.
    name: 'ws-metric',
    run: (page) =>
      page.evaluate(() =>
        [...document.querySelectorAll('.ws-metric, .ws-metric-content strong')].flatMap((el, i) =>
          el.scrollWidth > el.clientWidth
            ? [el.className + ' #' + (i + 1) + ' scrollWidth ' + el.scrollWidth + ' > clientWidth ' + el.clientWidth]
            : [],
        ),
      ),
  },
  {
    // Rótulos de eixo SVG (charts.css) devem ficar inteiros dentro do svg que os contém.
    name: 'chart-axis',
    run: (page) =>
      page.evaluate(() =>
        [...document.querySelectorAll('svg text.chart-axis')].flatMap((el, i) => {
          const t = el.getBoundingClientRect();
          const s = el.ownerSVGElement.getBoundingClientRect();
          if (!t.width) return [];
          const out = Math.max(s.left - t.left, t.right - s.right, s.top - t.top, t.bottom - s.bottom);
          return out > 0.5 ? ['"' + el.textContent + '" #' + (i + 1) + ' fora do svg em ' + Math.round(out) + 'px'] : [];
        }),
      ),
  },
];

async function capture(page, label, viewport, violations) {
  await page.evaluate(() => document.fonts.ready);
  const file = path.join(out, label + '-' + viewport.width + '.png');
  await page.screenshot({ path: file, fullPage: true, animations: 'disabled' });
  console.log('captura', path.relative(process.cwd(), file));
  for (const check of checks) {
    for (const message of await check.run(page)) {
      violations.push(label + ' @' + viewport.width + ' [' + check.name + ']: ' + message);
    }
  }
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const violations = [];
  const errors = [];
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
    console.log('Chromium', browser.version());
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
      page.on('pageerror', (err) => errors.push(err.message));
      await serve(page);
      for (const view of views) {
        await openView(page, view);
        await capture(page, view, viewport, violations);
      }
      // Diálogo de detalhe do primeiro registro de #demands.
      await openView(page, 'demands');
      await page.locator('.ws-entity-button').first().click();
      await page.getByRole('dialog').waitFor();
      await capture(page, 'demands-detalhe', viewport, violations);
      await page.close();
    }
  } finally {
    await browser?.close();
  }
  if (errors.length) console.error('Erros de página:\n' + errors.join('\n'));
  if (violations.length) {
    console.error('\nViolações (' + violations.length + '):\n' + violations.map((v) => ' - ' + v).join('\n'));
  } else {
    console.log('\nNenhuma violação.');
  }
  if (errors.length || (violations.length && !allowOverflow)) process.exitCode = 1;
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
