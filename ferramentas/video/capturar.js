// Joga uma partida real do Safra (TV + 3 celulares, no site publicado) e tira prints das telas para o vídeo.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const R = require('../../safra/regras.js');

const BASE = 'https://danieldelajustina.github.io/jogos-do-sudoeste/';
const FB = 'https://trilhos-sudoeste-366928-default-rtdb.firebaseio.com/';
const OUT = path.join(__dirname, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const meta = {};
let sala;

async function fb(method, p, data) {
  const r = await fetch(FB + p + '.json', { method, headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  return r.json();
}

// posição (em px CSS) das partes da tela do celular, para o vídeo saber onde rolar
async function marcas(page) {
  return page.evaluate(() => {
    const out = [];
    document.querySelectorAll('h3, .vez, .negocio, #pegar, .fichas, [data-op], .status.ok').forEach((el) => {
      const r = el.getBoundingClientRect();
      out.push({ tag: el.tagName + '.' + el.className, txt: (el.textContent || '').trim().slice(0, 40), y: r.top + scrollY, x: r.left, w: r.width, h: r.height });
    });
    return { altura: document.documentElement.scrollHeight, itens: out };
  });
}

async function shotCel(page, nome) {
  await espera(400);
  await page.screenshot({ path: path.join(OUT, nome + '.png'), fullPage: true });
  meta[nome] = await marcas(page);
  console.log('foto', nome);
}
async function shotTV(page, nome) {
  await page.screenshot({ path: path.join(OUT, nome + '.png') });
  console.log('foto', nome);
}

async function celular(browser) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true });
  p.on('dialog', (d) => d.accept());
  return p;
}

async function estado() { return fb('GET', 'salas/' + sala + '/estado'); }
async function esperarVersao(v) {
  for (let i = 0; i < 80; i++) {
    const s = await estado();
    if (s && s.versao > v) {
      R.normalizar(s);
      return s;
    }
    await espera(250);
  }
  throw new Error('a TV não respondeu');
}

// robô simples (mesma ideia do simular-safra): compra o que der, senão pega o que falta
function escolher(s, idx) {
  const j = s.jogadores[idx];
  if (s.devolvendo) return { tipo: 'devolver', produto: R.PRODUTOS.concat('credito').slice().sort((a, b) => j.fichas[b] - j.fichas[a])[0] };
  const pv = R.privada(s, idx);
  const compraveis = Object.keys(pv.compra).map(Number).filter((id) => pv.compra[id].pode)
    .sort((a, b) => R.CARTAS[b].pontos - R.CARTAS[a].pontos || R.CARTAS[a].nivel - R.CARTAS[b].nivel);
  if (compraveis.length) return { tipo: 'comprar', carta: compraveis[0] };
  const alvo = [].concat(s.mesa[2], s.mesa[1], s.mesa[3], j.reservadas).sort((a, b) => pv.compra[a].falta - pv.compra[b].falta)[0];
  const b = R.bonus(j);
  const falta = (p) => (alvo !== undefined ? (R.CARTAS[alvo].custo[p] || 0) - b[p] - j.fichas[p] : 0);
  const quer = R.PRODUTOS.filter((p) => s.fichas[p] > 0).sort((p, q) => falta(q) - falta(p));
  if (quer.length >= 3) return { tipo: 'pegar', produtos: quer.slice(0, 3) };
  if (quer.length && s.fichas[quer[0]] >= 4) return { tipo: 'pegar', produtos: [quer[0], quer[0]] };
  if (j.reservadas.length < 3) return { tipo: 'reservar', nivel: 1 };
  return { tipo: 'pegar', produtos: quer.slice(0, Math.max(1, quer.length)) };
}

// faz o robô jogar (pelas chaves verdadeiras dos jogadores) até a condição parar(s) valer
async function avancar(keys, parar, limite = 300) {
  let s = await estado();
  R.normalizar(s);
  for (let n = 0; n < limite && s.fase === 'jogo'; n++) {
    if (parar(s)) return s;
    const a = escolher(s, s.vez);
    a.key = keys[s.vez];
    a.t = Date.now();
    await fb('POST', 'salas/' + sala + '/acoes', a);
    s = await esperarVersao(s.versao);
  }
  return s;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--hide-scrollbars'],
  });
  try {
    const tv = await browser.newPage();
    await tv.setViewport({ width: 1600, height: 900 });
    await tv.goto(BASE, { waitUntil: 'load' });
    await shotTV(tv, '01-menu');

    await tv.goto(BASE + 'safra/tv.html?nova=1', { waitUntil: 'load' });
    await tv.waitForFunction(() => /^[A-Z0-9]{5}$/.test(document.getElementById('codigo').textContent));
    sala = await tv.$eval('#codigo', (e) => e.textContent);
    console.log('sala', sala);
    await espera(1500);
    await shotTV(tv, '02-tv-sala');

    // Ana entra digitando o código
    const ana = await celular(browser);
    await ana.goto(BASE + 'entrar.html', { waitUntil: 'load' });
    await ana.type('#cod', sala);
    await shotCel(ana, '03-cel-codigo');
    await Promise.all([ana.waitForNavigation(), ana.click('#ir')]);
    await ana.waitForSelector('#nome');
    await espera(2000);
    await ana.$eval('#nome', (e) => { e.value = ''; });
    await ana.type('#nome', 'Ana');
    await shotCel(ana, '04-cel-nome');
    await ana.click('[data-op=entrar]');
    await ana.waitForFunction(() => document.body.innerText.includes('Você entrou'));

    // Beto e Carla entram pelo QR (link direto)
    const outros = [];
    for (const nome of ['Beto', 'Carla']) {
      const p = await celular(browser);
      await p.goto(BASE + 'safra/celular.html?sala=' + sala, { waitUntil: 'load' });
      await p.waitForSelector('#nome');
      await espera(2000);
      await p.$eval('#nome', (e) => { e.value = ''; });
      await p.type('#nome', nome);
      await p.click('[data-op=entrar]');
      await p.waitForFunction(() => document.body.innerText.includes('Você entrou'));
      outros.push(p);
    }
    const [beto, carla] = outros;
    await espera(1500);
    await shotCel(ana, '05-cel-sala');
    await shotTV(tv, '06-tv-sala-cheia');

    const keys = [];
    for (const p of [ana, beto, carla]) keys.push(await p.evaluate((s) => localStorage.getItem('key_' + s), sala));

    // começa
    await ana.click('[data-op=comecar]');
    await tv.waitForFunction(() => document.getElementById('telaSala').classList.contains('hidden'));
    await espera(2000);
    await shotTV(tv, '07-tv-inicio');
    await shotCel(ana, '08-cel-vez');
    await shotCel(beto, '09-cel-espera');

    // Ana pega 3 diferentes, tocando um por um
    let s = await estado();
    R.normalizar(s);
    const tres = escolher(s, 0).produtos || ['leite', 'milho', 'soja'];
    for (const p of tres) {
      await ana.click('[data-prod=' + p + ']');
      await espera(200);
    }
    await shotCel(ana, '10-cel-selecao');
    meta.selecao = tres;
    await ana.click('#pegar');
    s = await esperarVersao(s.versao);
    await espera(1500);
    await shotTV(tv, '11-tv-depois-pegar');
    await shotCel(ana, '12-cel-depois-pegar');

    // Beto pega 2 iguais
    const igual = R.PRODUTOS.find((p) => s.fichas[p] >= 4);
    await beto.click('[data-prod=' + igual + ']');
    await espera(200);
    await beto.click('[data-prod=' + igual + ']');
    await shotCel(beto, '13-cel-dois-iguais');
    meta.igual = igual;
    await beto.click('#pegar');
    s = await esperarVersao(s.versao);

    // Carla reserva um negócio de nível 2 da mesa
    const reservar = s.mesa[2][0];
    await espera(800);
    await carla.click('[data-reservar="' + reservar + '"]');
    s = await esperarVersao(s.versao);
    await espera(1200);
    await shotCel(carla, '14-cel-reservou');
    await shotTV(tv, '15-tv-reservou');
    meta.reservou = R.CARTAS[reservar].nome;

    // o robô joga até Ana poder comprar algo
    const podeComprar = (st, i) => st.vez === i && !st.devolvendo && Object.values(R.privada(st, i).compra).some((c) => c.pode);
    s = await avancar(keys, (st) => podeComprar(st, 0));
    await espera(1500);
    await shotCel(ana, '16-cel-pode-comprar');
    const pv = R.privada(s, 0);
    const compra = Object.keys(pv.compra).map(Number).filter((id) => pv.compra[id].pode)
      .sort((a, b) => R.CARTAS[b].pontos - R.CARTAS[a].pontos)[0];
    meta.comprou = R.CARTAS[compra].nome;
    meta.comprouId = compra;
    await ana.click('[data-comprar="' + compra + '"]');
    s = await esperarVersao(s.versao);
    await espera(700);
    await shotTV(tv, '17-tv-comprou');
    await espera(1200);
    await shotCel(ana, '18-cel-comprou');

    // até a primeira feira visitar alguém
    s = await avancar(keys, (st) => !!st.ultimaFeira);
    await espera(900);
    await shotTV(tv, '19-tv-feira');
    meta.feira = s.ultimaFeira && { nome: R.FEIRAS[s.ultimaFeira.feira].nome, jogador: s.jogadores[s.ultimaFeira.jogador].nome };

    // meio do jogo, na vez da Ana
    s = await avancar(keys, (st) => st.vez === 0 && !st.devolvendo && R.pontos(st.jogadores[0]) >= 6);
    await espera(1200);
    await shotCel(ana, '20-cel-meio');
    await shotTV(tv, '21-tv-meio');

    // última rodada
    s = await avancar(keys, (st) => st.ultimaRodada);
    await espera(1500);
    await shotTV(tv, '22-tv-ultima');
    await shotCel(ana, '23-cel-ultima');
    meta.chegou15 = s.log.slice().reverse().find((l) => JSON.stringify(l).includes('Última rodada')) || '';

    // fim
    s = await avancar(keys, () => false);
    await espera(2500);
    await shotTV(tv, '24-tv-fim');
    await shotCel(ana, '25-cel-fim');
    await shotCel(beto, '26-cel-fim-beto');
    meta.placar = s.jogadores.map((j) => ({ nome: j.nome, pontos: R.pontos(j) }));
    meta.vencedores = (s.vencedores || []).map((i) => s.jogadores[i].nome);
  } finally {
    fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
    if (sala) await fb('DELETE', 'salas/' + sala);
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
