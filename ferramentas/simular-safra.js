// Simula partidas do Safra com robôs: compram o que der (mais pontos primeiro), senão pegam produtos úteis.
const SR = require('../js/sala-regras.js');
const R = require('../safra/regras.js');

function robo(s, idx) {
  const j = s.jogadores[idx];
  const key = j.key;
  const ap = (a) => SR.aplicar(s, R, key, a);
  if (s.devolvendo) {
    const p = R.PRODUTOS.slice().sort((a, b) => j.fichas[b] - j.fichas[a])[0];
    return ap({ tipo: 'devolver', produto: p });
  }
  const pv = R.privada(s, idx);
  const compraveis = Object.keys(pv.compra).map(Number).filter((id) => pv.compra[id].pode)
    .sort((a, b) => R.CARTAS[b].pontos - R.CARTAS[a].pontos || R.CARTAS[a].nivel - R.CARTAS[b].nivel);
  if (compraveis.length) return ap({ tipo: 'comprar', carta: compraveis[0] });
  // mira a carta de nível mais alto com menor falta
  const alvo = [].concat(s.mesa[2], s.mesa[1], s.mesa[3]).sort((a, b) => pv.compra[a].falta - pv.compra[b].falta)[0];
  const b = R.bonus(j);
  const quer = R.PRODUTOS.filter((p) => s.fichas[p] > 0).sort((p, q) => {
    const np = alvo !== undefined ? (R.CARTAS[alvo].custo[p] || 0) - b[p] - j.fichas[p] : 0;
    const nq = alvo !== undefined ? (R.CARTAS[alvo].custo[q] || 0) - b[q] - j.fichas[q] : 0;
    return nq - np;
  });
  if (Math.random() < 0.08 && j.reservadas.length < 3 && alvo !== undefined) return ap({ tipo: 'reservar', carta: alvo });
  const e = ap({ tipo: 'pegar', produtos: quer.slice(0, 3) });
  if (e) return ap({ tipo: 'reservar', nivel: 1 }) && ap({ tipo: 'pegar', produtos: quer.slice(0, 1) });
  return null;
}

for (const n of [2, 3, 4]) {
  let turnos = 0;
  const pts = [];
  let travou = 0;
  for (let k = 0; k < 40; k++) {
    const s = SR.novoEstado('TESTE', 'safra');
    for (let i = 0; i < n; i++) SR.aplicar(s, R, 'k' + i, { tipo: 'entrar', nome: 'R' + i });
    SR.aplicar(s, R, 'k0', { tipo: 'comecar' });
    let t = 0;
    while (s.fase === 'jogo' && t < 2000) {
      t++;
      robo(s, s.vez);
    }
    if (s.fase !== 'fim') travou++;
    turnos += t;
    s.jogadores.forEach((j) => pts.push(R.pontos(j)));
    // conservação de fichas
    R.PRODUTOS.concat('credito').forEach((p) => {
      const total = s.fichas[p] + s.jogadores.reduce((a, j) => a + j.fichas[p], 0);
      const esperado = p === 'credito' ? 5 : n <= 2 ? 4 : n === 3 ? 5 : 7;
      if (total !== esperado) throw new Error('fichas de ' + p + ' sumiram: ' + total);
    });
  }
  pts.sort((a, b) => a - b);
  console.log(`${n} jogadores: ~${Math.round(turnos / 40)} ações por partida, travou ${travou}x, pontos de ${pts[0]} a ${pts[pts.length - 1]} (mediana ${pts[Math.floor(pts.length / 2)]})`);
}
console.log('cartas:', R.CARTAS.length, '| feiras:', R.FEIRAS.length, '| exemplo nível 3:', JSON.stringify(R.CARTAS[R.CARTAS.length - 1]));
