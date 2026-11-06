const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const [originalDist, finalDist = 'dist'] = process.argv.slice(2);
if (!originalDist) {
  console.error('Uso: npm run test:parity -- <dist-original> [dist-refatorado]');
  process.exit(1);
}

const roots = [originalDist, finalDist].map((dir) => path.resolve(dir));
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
const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
};

async function serve(page, { root, url }) {
  await page.route('https://fonts.googleapis.com/**', (route) => route.abort());
  await page.route(url + '**', async (route) => {
    const name = new URL(route.request().url()).pathname;
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404 });
    await route.fulfill({ status: 200, contentType: mime[path.extname(file)], path: file });
  });
}

let navigationSequence = 0;
async function openView(page, url, route) {
  await page.goto(url + '?qa=' + ++navigationSequence + '#' + route, { waitUntil: 'networkidle' });
  await page.locator('.loading-strip').waitFor({ state: 'hidden' });
  await page.locator('.nav-item.active').waitFor();
}

async function exercise(page, url) {
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  const dialog = page.getByRole('dialog');
  const go = async (label) => {
    await nav.getByRole('button', { name: label, exact: true }).click();
    await page.locator('.loading-strip').waitFor({ state: 'hidden' });
  };
  await openView(page, url, 'service');
  assert.equal(new URL(page.url()).hash, '#demands');
  await page.getByLabel('Incluir encerradas').check();
  await page.getByRole('button', { name: /^Por categoria/ }).click();
  await page.locator('.ws-local-filter select').selectOption({ index: 1 });
  const first = page.locator('.ws-entity-button').first();
  const selectedId = await first.locator('.ws-row-id').innerText();
  await first.click();
  await dialog.getByText(selectedId, { exact: false }).first().waitFor();
  assert.equal(
    await dialog
      .getByRole('button', { name: 'Fechar detalhes' })
      .evaluate((e) => e === document.activeElement),
    true
  );
  await page.keyboard.press('Shift+Tab');
  assert.equal(
    await dialog
      .getByRole('button', { name: 'Fechar', exact: true })
      .evaluate((e) => e === document.activeElement),
    true
  );
  await dialog.getByRole('tab', { name: 'Histórico' }).click();
  await dialog.getByRole('tabpanel').waitFor();
  await dialog.getByRole('tab', { name: /^Vínculos/ }).click();
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  assert.equal(await first.evaluate((e) => e === document.activeElement), true);

  await go('Cobrança');
  await page.getByRole('button', { name: /^Campanhas \d+$/ }).click();
  await page.locator('.ws-campaign').first().click();
  await dialog.waitFor();
  await dialog.getByRole('button', { name: 'Fechar detalhes' }).click();
  await go('Inadimplência');
  await page.getByLabel('Segmentar inadimplência').selectOption('amountBand');
  assert.equal(await page.getByLabel('Valor da segmentação').isDisabled(), true);
  await page.getByLabel('Segmentar inadimplência').selectOption('all');
  await page.getByRole('button', { name: 'Próxima página' }).click();
  assert.match(await page.locator('.ws-pagination').innerText(), /11–20/);
  const search = page.getByRole('textbox', { name: 'Pesquisar Inadimplência' });
  await search.fill('SEM REGISTRO QA');
  assert.equal(await page.getByRole('button', { name: 'Baixar PDF' }).isDisabled(), true);
  await search.fill('');
  await page.getByRole('button', { name: 'Filtros avançados' }).click();
  await page.getByLabel('Status do processo').selectOption({ index: 1 });
  await go('Negociação');
  assert.equal(await page.getByLabel('Status do processo').inputValue(), 'all');
  await page.getByLabel('Prévia de perfil').selectOption('Equipe');

  await go('Configurações');
  await page.getByText('Acesso administrativo restrito').waitFor();
  await page.getByLabel('Prévia administrativa').check();
  await page.getByRole('heading', { name: 'Parâmetros administrativos', exact: true }).waitFor();
  await go('Relatórios');
  await page
    .locator('.ws-report-choices')
    .getByRole('button', { name: /^Recuperação/ })
    .click();
  await page.getByRole('button', { name: /^Período anterior/ }).click();
  await dialog.getByText('Recuperação · período anterior', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await page.getByLabel('Início do período').fill('2026-06-01');
  await page.getByLabel('Fim do período').fill('2026-01-01');
  await page.getByText('Revise o período').waitFor();
  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await page.getByRole('button', { name: 'Atualizar' }).click();
  await page.getByText('Demonstração recarregada.', { exact: false }).waitFor();

  await openView(page, url, 'exports');
  assert.equal(new URL(page.url()).hash, '#reports');
  await page
    .locator('.ws-report-choices')
    .getByRole('button', { name: /^Recuperação/ })
    .click();
  await page.getByLabel('Conteúdo do relatório').selectOption('summary');
  const reportActions = page.locator('.ws-table-toolbar .doc-actions');
  const pdfEvent = page.waitForEvent('download');
  await reportActions.getByRole('button', { name: 'Baixar PDF' }).click();
  const pdf = await pdfEvent;
  assert.match(pdf.suggestedFilename(), /-resumo-.*\.pdf$/);
  const bytes = fs.readFileSync(await pdf.path());
  assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
  assert.ok(bytes.length > 1000);
  await reportActions.getByRole('button', { name: 'Imprimir' }).click();
  await page.waitForFunction(() => window.printed.length > 0);
  const html = await page.evaluate(() => window.printed.at(-1));
  assert.match(html, /Distribuição por domínio e estado/);
  await page.locator('iframe[title^="Documento de impressão"]').waitFor({ state: 'detached' });

  const id = await page.locator('.ws-row-id').first().innerText();
  await page.getByRole('textbox', { name: 'Pesquisar Relatório · Recuperação' }).fill(id);
  await page.getByLabel('Conteúdo do relatório').selectOption('detailed');
  const detailPdfEvent = page.waitForEvent('download');
  await reportActions.getByRole('button', { name: 'Baixar PDF' }).click();
  const detailPdf = await detailPdfEvent;
  assert.match(detailPdf.suggestedFilename(), /-detalhado-.*\.pdf$/);
  const detailBytes = fs.readFileSync(await detailPdf.path());
  assert.equal(detailBytes.subarray(0, 5).toString(), '%PDF-');
  await reportActions.getByRole('button', { name: 'Imprimir' }).click();
  await page.waitForFunction(() => window.printed.length === 2);
  const detailHtml = await page.evaluate(() => window.printed.at(-1));
  assert.match(detailHtml, new RegExp('data-record-id="payment:' + id + '"'));
  assert.equal((detailHtml.match(/data-record-id=/g) || []).length, 1);
  await page.locator('iframe[title^="Documento de impressão"]').waitFor({ state: 'detached' });

  await page.goto(url + '?scenario=error#reports', { waitUntil: 'networkidle' });
  await page.getByText('Não foi possível atualizar a consulta').waitFor();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await page.locator('.ws-report-choices').waitFor();
  assert.equal(new URL(page.url()).searchParams.has('scenario'), false);
  return { summary: html, detailed: detailHtml, summaryPdf: bytes, detailedPdf: detailBytes };
}

async function pixelDifference(page, buffers) {
  return page.evaluate(
    async ([before, after]) => {
      async function decode(base64) {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const canvas = new OffscreenCanvas(image.width, image.height);
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const { data, width, height } = context.getImageData(0, 0, image.width, image.height);
        return { pixels: new Uint32Array(data.buffer), width, height };
      }
      const [first, second] = await Promise.all([decode(before), decode(after)]);
      if (first.width !== second.width || first.height !== second.height) {
        throw new Error(
          'Dimensões diferentes: ' +
            first.width +
            '×' +
            first.height +
            ' e ' +
            second.width +
            '×' +
            second.height
        );
      }
      let changed = 0;
      for (let index = 0; index < first.pixels.length; index++) {
        if (first.pixels[index] !== second.pixels[index]) changed++;
      }
      return changed;
    },
    buffers.map((buffer) => buffer.toString('base64'))
  );
}

// Opt-in: PARITY_SKIP_PIXELS=1 ignora só a comparação de pixels (mudança visual intencional).
const skipPixels = process.env.PARITY_SKIP_PIXELS === '1';

async function main() {
  const hosts = roots.map((root, i) => ({ root, url: 'http://build-' + i + '.local/' }));
  let browser;
  try {
    browser = await chromium.launch({
      executablePath: process.env.CHROME_PATH,
      headless: true,
    });
    console.log('Chromium', browser.version());
    const failures = [];
    for (const viewport of [
      { width: 1440, height: 1000 },
      { width: 390, height: 844 },
    ]) {
      const pages = await Promise.all(
        hosts.map(() => browser.newPage({ viewport, reducedMotion: 'reduce' }))
      );
      await Promise.all(pages.map((page, i) => serve(page, hosts[i])));
      pages.forEach((page) => page.on('pageerror', (err) => failures.push(err.message)));
      for (const view of views) {
        const buffers = await Promise.all(
          pages.map(async (page, i) => {
            await openView(page, hosts[i].url, view);
            await page.evaluate(() => document.fonts.ready);
            return page.screenshot({ fullPage: true, animations: 'disabled' });
          })
        );
        if (skipPixels) {
          console.log('visual', viewport.width, view, 'comparação de pixels ignorada (PARITY_SKIP_PIXELS=1)');
        } else {
          const difference = buffers[0].equals(buffers[1]) ? 0 : await pixelDifference(pages[0], buffers);
          assert.equal(difference, 0, view + ' em ' + viewport.width + ' px');
          console.log('visual', viewport.width, view, '0 pixels diferentes');
        }
      }
      if (viewport.width === 390) {
        for (const page of pages) {
          await page.getByRole('button', { name: 'Abrir menu' }).click();
          await page
            .getByRole('navigation')
            .getByRole('button', { name: 'Demandas', exact: true })
            .click();
          await page.getByText('Fila de acompanhamento').waitFor();
          assert.equal(
            await page.getByRole('button', { name: 'Abrir menu' }).getAttribute('aria-expanded'),
            'false'
          );
        }
        console.log('menu móvel aprovado nas duas versões');
      }
      await Promise.all(pages.map((page) => page.close()));
    }
    const print = [];
    for (const [index, host] of hosts.entries()) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        acceptDownloads: true,
      });
      page.on('pageerror', (err) => failures.push(err.message));
      await serve(page, host);
      await page.clock.setFixedTime(new Date('2026-11-05T14:00:00Z'));
      await page.addInitScript(() => {
        if (window === window.top) {
          window.printed = [];
          window.addEventListener('message', (e) => {
            if (e.data?.type === 'qa-print') window.printed.push(e.data.html);
          });
        } else {
          window.print = () => {
            window.parent.postMessage(
              { type: 'qa-print', html: document.documentElement.outerHTML },
              '*'
            );
            setTimeout(() => window.dispatchEvent(new Event('afterprint')), 25);
          };
        }
      });
      print.push(await exercise(page, host.url));
      console.log('fluxos aprovados:', index === 0 ? 'original' : 'refatorado');
      await page.close();
    }
    for (const key of ['summary', 'detailed']) assert.equal(print[0][key], print[1][key], key + ' HTML');
    const normalizePdf = (buffer) =>
      buffer
        .toString('latin1')
        .replace(/(^\/ID\s*\[\s*)<[a-f0-9]{32}>\s*<[a-f0-9]{32}>/im, '$1<id><id>');
    for (const key of ['summaryPdf', 'detailedPdf'])
      assert.equal(normalizePdf(print[0][key]), normalizePdf(print[1][key]), key);
    console.log('HTML e PDFs idênticos nas modalidades resumida e detalhada');
    assert.deepEqual(failures, []);
  } finally {
    await browser?.close();
  }
}
main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
