// Regenera las capturas del README sin Electron ni certificado de ARCA: abre las
// vistas reales (src/views) en Edge headless y reemplaza `window.croessant` (el
// puente del preload) por datos de ejemplo.
//
//   npm run screenshots
//   BROWSER_CHANNEL=chrome npm run screenshots

import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const view = (name) => pathToFileURL(join(root, 'src/views', name)).href;
const out = (name) => join(root, 'docs', `${name}.png`);

execSync('npm run css', { cwd: root, stdio: 'inherit' });

/** Corre en la página antes que sus scripts. `scenario` elige los datos. */
function fakeBridge(scenario) {
  const pad = (n) => String(n).padStart(2, '0');
  const arcaDate = (d) => Number(`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`);
  const daysAgo = (n) => arcaDate(new Date(Date.now() - n * 86400000));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const invoices = [
    { number: 118, date: daysAgo(1), concept: 2, total: 85000, cae: '76123456789012' },
    { number: 119, date: daysAgo(1), concept: 2, total: 42500, cae: '76123456789013' },
    { number: 120, date: daysAgo(0), concept: 1, total: 18990.5, cae: '76123456789014' },
    { number: 121, date: daysAgo(0), concept: 2, total: 120000, cae: '76123456789015' },
  ];

  window.croessant = {
    info: async () => ({ environment: 'production', maxAmount: 10000000 }),
    invoiceDateRange: async () => ({ min: daysAgo(5), max: daysAgo(-5) }),
    getConfig: async () =>
      scenario === 'empty' ? { cuit: '', hasCert: false, hasKey: false } : { cuit: '20123456789', hasCert: true, hasKey: true },
    saveConfig: async () => {},
    clearConfig: async () => {},
    pickFiles: async () => null,
    importFiles: async () => ({ hasCert: true, hasKey: true }),
    connect: async () => {
      await wait(150);
      return {
        status: 'ok',
        pointsOfSale: [
          { number: 3, type: 'RECE para aplicativo y web services' },
          { number: 4, type: 'RECE para aplicativo y web services' },
        ],
      };
    },
    lastInvoice: async () => ({ number: 121, date: daysAgo(0) }),
    createInvoice: async () => ({ number: 122, date: daysAgo(0), cae: '76123456789016' }),
    listInvoices: async () => invoices,
  };
}

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
try {
  const shoot = async (name, url, scenario, act) => {
    const page = await browser.newPage({ viewport: { width: 500, height: 900 }, deviceScaleFactor: 2 });
    await page.addInitScript(fakeBridge, scenario);
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => !document.querySelector('.pageloader.is-active'));
    if (act) await act(page);
    await page.waitForTimeout(700); // animaciones de animate.css
    await page.screenshot({ path: out(name) });
    console.log(`docs/${name}.png`);
    await page.close();
  };

  await shoot('configuracion', view('configurate.html'), 'empty');
  await shoot('configuracion-lista', view('configurate.html'), 'configured');
  await shoot('generar', view('generate_invoice.html'), 'configured', async (page) => {
    await page.selectOption('#concept', '2');
    await page.fill('#amount', '85000');
  });
  await shoot('generada', view('generate_invoice.html'), 'configured', async (page) => {
    await page.selectOption('#concept', '2');
    await page.fill('#amount', '85000');
    await page.click('#generateInvoice');
    await page.waitForSelector('.notification.is-success');
  });
  await shoot('consulta', view('invoices_list.html'), 'configured', async (page) => {
    await page.waitForSelector('.invoice-list-item:not([id])');
  });
  await shoot('sin-conexion', view('error/connection.html') + '?detail=' + encodeURIComponent('ARCA no responde (getaddrinfo ENOTFOUND wsaa.afip.gov.ar)'), 'configured');
} finally {
  await browser.close();
}
