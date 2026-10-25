// Tira prints de alguns instantes do MP4 final: node conferir.js 5 40 133
const http = require('http'), fs = require('fs'), path = require('path'), puppeteer = require('puppeteer-core');
const tempos = process.argv.slice(2).map(Number);
const srv = http.createServer((q, r) => {
  const f = path.join(__dirname, q.url.split('?')[0]);
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': f.endsWith('.mp4') ? 'video/mp4' : 'text/html' });
    r.end(d);
  });
}).listen(0);
(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const p = await b.newPage();
  await p.setViewport({ width: 1920, height: 1080 });
  await p.goto(`http://localhost:${srv.address().port}/vazio.html`).catch(() => {});
  await p.setContent(`<body style="margin:0;background:red"><video id=v src="http://localhost:${srv.address().port}/safra-como-jogar.mp4" muted style="width:1920px;height:1080px"></video></body>`);
  for (const t of tempos) {
    await p.evaluate(async (t) => {
      const v = document.getElementById('v');
      if (v.readyState < 1) await new Promise((r) => (v.onloadedmetadata = r));
      v.currentTime = t;
      await new Promise((r) => (v.onseeked = r));
      await new Promise((r) => setTimeout(r, 500));
    }, t);
    await p.screenshot({ path: path.join(__dirname, 'quadro-' + t + '.png'), scale: 0.5 });
    console.log('ok', t);
  }
  await b.close();
  srv.close();
})();
