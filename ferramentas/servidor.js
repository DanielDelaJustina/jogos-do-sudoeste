// Servidor local só para testar (o jogo de verdade fica no GitHub Pages). Rodar: node ferramentas/servidor.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const PORTA = Number(process.env.PORT) || 5500;

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const arquivo = path.join(RAIZ, url === '/' ? 'index.html' : url);
  if (!arquivo.startsWith(RAIZ)) {
    res.writeHead(403);
    return res.end();
  }
  fs.readFile(arquivo, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('não encontrado');
    }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORTA, () => console.log('Trilhos do Sudoeste em http://localhost:' + PORTA));
