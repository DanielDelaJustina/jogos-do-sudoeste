// Gera js/mapa.js: posições das cidades (de latitude/longitude reais aproximadas) e rotas entre vizinhas.
// Rodar: node ferramentas/gerar-mapa.js   (depois dá para ajustar o arquivo gerado à mão)
const fs = require('fs');
const path = require('path');

const CIDADES = [
  ['Pato Branco', -26.229, -52.671], ['Francisco Beltrão', -26.081, -53.055], ['Dois Vizinhos', -25.749, -53.057],
  ['Verê', -25.877, -52.906], ["Itapejara d'Oeste", -25.962, -52.817], ['Coronel Vivida', -25.979, -52.568],
  ['Chopinzinho', -25.856, -52.528], ['Mangueirinha', -25.941, -52.176], ['Clevelândia', -26.404, -52.355],
  ['Palmas', -26.484, -51.99], ['Mariópolis', -26.355, -52.554], ['Vitorino', -26.268, -52.784],
  ['Renascença', -26.158, -52.97], ['Marmeleiro', -26.149, -53.026], ['Flor da Serra do Sul', -26.256, -53.309],
  ['Barracão', -26.25, -53.632], ['Santo Antônio do Sudoeste', -26.074, -53.725], ['Pranchita', -26.021, -53.74],
  ['Capanema', -25.672, -53.809], ['Planalto', -25.721, -53.765], ['Ampére', -25.916, -53.469],
  ['Realeza', -25.769, -53.532], ['Salto do Lontra', -25.781, -53.313], ['Enéas Marques', -25.944, -53.165],
  ["São Jorge d'Oeste", -25.701, -52.92], ['Nova Prata do Iguaçu', -25.631, -53.346], ['São João', -25.821, -52.725],
  ['Saudade do Iguaçu', -25.693, -52.618], ['Bom Sucesso do Sul', -26.073, -52.835], ['Coronel Domingos Soares', -26.228, -52.036],
  ['Honório Serpa', -26.139, -52.385],
];

const W = 1600;
const H = 900;
const M = 70; // margem
const lons = CIDADES.map((c) => c[2]);
const lats = CIDADES.map((c) => c[1]);
const lonMin = Math.min(...lons);
const lonMax = Math.max(...lons);
const latMin = Math.min(...lats);
const latMax = Math.max(...lats);
const kx = Math.cos((26 * Math.PI) / 180);
const scale = Math.min((W - 2 * M) / ((lonMax - lonMin) * kx), (H - 2 * M) / (latMax - latMin));
const cidades = CIDADES.map(([nome, lat, lon], i) => ({
  id: i,
  nome,
  x: Math.round(M + (lon - lonMin) * kx * scale),
  y: Math.round(M + (latMax - lat) * scale),
}));

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function cruza(p1, p2, p3, p4) {
  const d = (a, b, c) => (c.x - a.x) * (b.y - a.y) - (b.x - a.x) * (c.y - a.y);
  if ([p1, p2].some((p) => p === p3 || p === p4)) return false;
  return d(p3, p4, p1) * d(p3, p4, p2) < 0 && d(p1, p2, p3) * d(p1, p2, p4) < 0;
}

// candidatas: cada cidade com as vizinhas mais próximas; as curtas entram primeiro, sem cruzar
const cand = [];
for (const a of cidades) {
  const viz = cidades.filter((b) => b !== a).sort((p, q) => dist(a, p) - dist(a, q)).slice(0, 5);
  for (const b of viz) if (a.id < b.id || !viz.includes(a)) cand.push([Math.min(a.id, b.id), Math.max(a.id, b.id)]);
}
const unicas = [...new Set(cand.map((c) => c.join('-')))].map((s) => s.split('-').map(Number))
  .sort((p, q) => dist(cidades[p[0]], cidades[p[1]]) - dist(cidades[q[0]], cidades[q[1]]));
const rotas = [];
for (const [i, j] of unicas) {
  const a = cidades[i];
  const b = cidades[j];
  if (dist(a, b) > 330) continue;
  if (rotas.some((r) => cruza(a, b, cidades[r.a], cidades[r.b]))) continue;
  // não passar raspando por outra cidade
  if (cidades.some((c) => c !== a && c !== b && pontoSeg(c, a, b) < 34)) continue;
  rotas.push({ a: i, b: j });
}
function pontoSeg(p, a, b) {
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / ((b.x - a.x) ** 2 + (b.y - a.y) ** 2)));
  return Math.hypot(p.x - (a.x + t * (b.x - a.x)), p.y - (a.y + t * (b.y - a.y)));
}

// toda cidade com pelo menos 2 rotas (liga à vizinha mais próxima que não cruze nada)
for (const c of cidades) {
  const grau = () => rotas.filter((r) => r.a === c.id || r.b === c.id).length;
  const viz = cidades.filter((o) => o !== c).sort((p, q) => dist(c, p) - dist(c, q));
  for (const o of viz) {
    if (grau() >= 2) break;
    if (rotas.some((r) => (r.a === c.id && r.b === o.id) || (r.b === c.id && r.a === o.id))) continue;
    if (rotas.some((r) => cruza(c, o, cidades[r.a], cidades[r.b]))) continue;
    rotas.push({ a: Math.min(c.id, o.id), b: Math.max(c.id, o.id) });
  }
}

// tamanho (vagões) pela distância; cores distribuídas para ficar equilibrado; algumas cinzas (qualquer cor)
const CORES = ['vermelho', 'azul', 'verde', 'amarelo', 'laranja', 'roxo', 'preto', 'branco'];
const usoCor = Object.fromEntries(CORES.map((c) => [c, 0]));
rotas.forEach((r, k) => {
  r.n = Math.max(1, Math.min(6, Math.round(dist(cidades[r.a], cidades[r.b]) / 62)));
  if (k % 5 === 4) r.cor = 'cinza';
  else {
    const cor = CORES.slice().sort((p, q) => usoCor[p] - usoCor[q] || Math.random() - 0.5)[0];
    r.cor = cor;
    usoCor[cor] += r.n;
  }
});
// rotas duplas nos trechos principais (só valem com 4+ jogadores)
const DUPLAS = [['Pato Branco', 'Francisco Beltrão'], ['Francisco Beltrão', 'Dois Vizinhos'], ['Pato Branco', 'Coronel Vivida']];
for (const [x, y] of DUPLAS) {
  const ia = cidades.find((c) => c.nome === x).id;
  const ib = cidades.find((c) => c.nome === y).id;
  const r = rotas.find((q) => (q.a === ia && q.b === ib) || (q.a === ib && q.b === ia));
  if (r) rotas.push({ a: r.a, b: r.b, n: r.n, cor: CORES.find((c) => c !== r.cor && usoCor[c] === Math.min(...CORES.map((k) => usoCor[k]))) || 'cinza', dupla: true });
}

// bilhetes de destino: pontos = menor caminho em vagões entre as duas cidades
function menorCaminho(o) {
  const d = cidades.map(() => Infinity);
  d[o] = 0;
  const feito = new Set();
  while (feito.size < cidades.length) {
    let u = -1;
    for (let i = 0; i < cidades.length; i++) if (!feito.has(i) && (u === -1 || d[i] < d[u])) u = i;
    feito.add(u);
    for (const r of rotas) {
      if (r.dupla) continue;
      const v = r.a === u ? r.b : r.b === u ? r.a : -1;
      if (v >= 0 && d[u] + r.n < d[v]) d[v] = d[u] + r.n;
    }
  }
  return d;
}
const todos = [];
for (let i = 0; i < cidades.length; i++) {
  const d = menorCaminho(i);
  for (let j = i + 1; j < cidades.length; j++) todos.push({ a: i, b: j, pontos: d[j] });
}
// escolhe bilhetes variados: curtos, médios e longos, sem repetir demais a mesma cidade
const bilhetes = [];
const usoCidade = cidades.map(() => 0);
const faixas = [[5, 8, 12], [9, 13, 13], [14, 24, 7]]; // [min, max, quantidade]
for (const [min, max, qtd] of faixas) {
  const pool = todos.filter((t) => t.pontos >= min && t.pontos <= max).sort(() => Math.random() - 0.5);
  let n = 0;
  for (const t of pool) {
    if (n >= qtd) break;
    if (usoCidade[t.a] >= 3 || usoCidade[t.b] >= 3) continue;
    usoCidade[t.a]++;
    usoCidade[t.b]++;
    bilhetes.push(t);
    n++;
  }
}
console.log('bilhetes:', bilhetes.length, 'pontos de', Math.min(...bilhetes.map((b) => b.pontos)), 'a', Math.max(...bilhetes.map((b) => b.pontos)));

const out = `// Gerado por ferramentas/gerar-mapa.js (pode ser ajustado à mão). Coordenadas num mapa de ${W} x ${H}.
window.MAPA = ${JSON.stringify({
  largura: W, altura: H, cidades,
  rotas: rotas.map((r, i) => Object.assign({ id: i }, r)),
  bilhetes: bilhetes.map((b, i) => Object.assign({ id: i }, b)),
}, null, 1)};
`;
fs.mkdirSync(path.join(__dirname, '..', 'js'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '..', 'js', 'mapa.js'), out);
console.log(`${cidades.length} cidades, ${rotas.length} rotas, ${rotas.reduce((a, r) => a + r.n, 0)} vagões no total`);
console.log('uso de cores:', usoCor);
const grau = cidades.map((c) => rotas.filter((r) => r.a === c.id || r.b === c.id).length);
console.log('cidades com só 1 rota:', cidades.filter((c, i) => grau[i] < 2).map((c) => c.nome).join(', ') || 'nenhuma');
