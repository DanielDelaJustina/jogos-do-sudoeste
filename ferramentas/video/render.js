// Abre montar.html num Chrome headless e grava o MP4 (ou só tira prévias com --previa).
const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DIR = __dirname;
const previa = process.argv.includes('--previa');
const SAIDA = process.argv.find((a) => a.endsWith('.mp4')) || path.join(DIR, 'safra-como-jogar.mp4');

const srv = http.createServer((req, res) => {
  const arq = path.join(DIR, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(arq, (err, d) => {
    if (err) { res.writeHead(404); return res.end(); }
    const tipo = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(arq)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': tipo });
    res.end(d);
  });
}).listen(0);

(async () => {
  const porta = srv.address().port;
  const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    page.on('console', (m) => console.log('[pág]', m.text()));
    page.on('pageerror', (e) => console.log('[erro]', e.message));
    await page.goto(`http://localhost:${porta}/montar.html`, { waitUntil: 'load' });
    if (previa) {
      await page.evaluate(() => window.carregar());
      const tempos = process.argv.filter((a) => /^\d+(\.\d+)?$/.test(a)).map(Number);
      console.log('duração', await page.evaluate(() => window.TOTAL));
      for (const t of tempos) {
        await page.evaluate((x) => window.quadro(x), t);
        await page.screenshot({ path: path.join(DIR, 'previa-' + t + '.png') });
      }
      return;
    }
    const fd = fs.openSync(SAIDA, 'w');
    await page.exposeFunction('salvarParte', (b64) => { fs.writeSync(fd, Buffer.from(b64, 'base64')); });
    const r = await page.evaluate(() => gravar());
    fs.closeSync(fd);
    console.log('pronto', SAIDA, r);
  } finally {
    await browser.close();
    srv.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
