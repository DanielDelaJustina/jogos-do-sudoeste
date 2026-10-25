// Simula partidas da Expedição com robôs: colocam a peça onde ela mais encaixa, ou descartam e andam
// quando dá para aproximar os tropeiros dos destinos.
const SR = require('../js/sala-regras.js');
const R = require('../expedicao/regras.js');
const COL = R.COL;
const LIN = R.LIN;

function distDestino(s, e, pos) {
  if (pos === R.NO_TEMPLO) return -1;
  const t = R.casaDaBorda(s.templos[e]);
  const c = pos === R.NA_PARTIDA ? R.casaDaBorda(s.inicios[e]) : pos;
  return Math.abs(Math.floor(c / COL) - Math.floor(t / COL)) + Math.abs((c % COL) - (t % COL)) + (pos === R.NA_PARTIDA ? 1 : 0);
}

function encaixe(s, tab, cel, sai) {
  const r = Math.floor(cel / COL);
  const c = cel % COL;
  let p = 0;
  for (const d of 'NSLO') {
    const tem = sai.includes(d);
    const r2 = r + R.DIRS[d][0];
    const c2 = c + R.DIRS[d][1];
    if (r2 < 0 || r2 >= LIN || c2 < 0 || c2 >= COL) {
      const borda = s.inicios.concat(s.templos).some((b) => b.lado === d && b.i === (d === 'N' || d === 'S' ? c : r));
      if (tem) p += borda ? 3 : -1;
      continue;
    }
    const viz = tab[r2 * COL + c2];
    if (viz < 0) continue;
    const casa = R.saidas(viz).includes({ N: 'S', S: 'N', L: 'O', O: 'L' }[d]);
    if (tem && casa) p += 2;
    else if (tem !== casa) p -= 1;
  }
  return p;
}

function rotas(s) {
  if (s._rotas) return s._rotas;
  s._rotas = s.inicios.map((_, e) => {
    const ini = s.inicios[e];
    const fim = s.templos[e];
    const a = R.casaDaBorda(ini);
    const b = R.casaDaBorda(fim);
    let r = Math.floor(a / COL);
    let c = a % COL;
    const rb = Math.floor(b / COL);
    const cb = b % COL;
    const casas = [];
    let entra = ini.lado;
    // sobe primeiro se saiu de baixo, anda para a direita primeiro se saiu da esquerda
    const passos = [];
    if (ini.lado === 'S') { for (let k = r; k > rb; k--) passos.push('N'); for (let k = c; k < cb; k++) passos.push(cb > c ? 'L' : 'O'); for (let k = c; k > cb; k--) passos.push('O'); }
    else { for (let k = c; k < cb; k++) passos.push('L'); for (let k = r; k > rb; k--) passos.push('N'); for (let k = r; k < rb; k++) passos.push('S'); }
    passos.push(fim.lado);
    for (const d of passos) {
      casas.push({ cel: r * COL + c, pede: entra + d });
      r += R.DIRS[d][0];
      c += R.DIRS[d][1];
      entra = { N: 'S', S: 'N', L: 'O', O: 'L' }[d];
    }
    return casas;
  });
  return s._rotas;
}

function robo(s, idx) {
  const j = s.jogadores[idx];
  const peca = R.PECAS[s.ordem[s.rodada]];
  // passos gulosos
  const exp = j.exp.slice();
  const passos = [];
  for (let k = 0; k < peca.saidas.length; k++) {
    let melhor = null;
    for (let e = 0; e < R.QTD; e++) {
      for (const para of R.destinos(s, j.tab, exp, e)) {
        const ganho = distDestino(s, e, exp[e]) - distDestino(s, e, para);
        if (ganho > 0 && (!melhor || ganho > melhor.g)) melhor = { e, para, g: ganho };
      }
    }
    if (!melhor) break;
    exp[melhor.e] = melhor.para;
    passos.push({ e: melhor.e, para: melhor.para });
  }
  let melhorCel = -1;
  let melhorGiro = 0;
  let melhorP = -99;
  j.tab.forEach((t, cel) => {
    if (t >= 0) return;
    for (let g = 0; g < 4; g++) {
      const p = encaixe(s, j.tab, cel, R.saidas(peca.id, g)) + Math.random();
      if (p > melhorP) { melhorP = p; melhorCel = cel; melhorGiro = g; }
    }
  });
  // prefere uma casa da rota planejada onde a peça (girada) sirva
  for (const rota of rotas(s)) {
    for (const casa of rota) {
      if (j.tab[casa.cel] >= 0) continue;
      for (let g = 0; g < 4; g++) {
        const sai = R.saidas(peca.id, g);
        if (casa.pede.split('').every((d) => sai.includes(d)) && melhorP < 50) { melhorP = 50; melhorCel = casa.cel; melhorGiro = g; }
      }
    }
  }
  const descarta = melhorCel < 0 || melhorP < 0.5 || (melhorP < 50 && passos.length >= 2);
  const key = j.key;
  const erro = descarta
    ? SR.aplicar(s, R, key, { tipo: 'descartar', passos })
    : SR.aplicar(s, R, key, { tipo: 'colocar', celula: melhorCel, giro: melhorGiro });
  if (erro) throw new Error(erro);
}

for (const n of [1, 3, 5]) {
  let rodadas = 0;
  let chegadas = 0;
  let completas = 0;
  const pts = [];
  const JOGOS = 60;
  for (let k = 0; k < JOGOS; k++) {
    const s = SR.novoEstado('TESTE', 'expedicao');
    for (let i = 0; i < n; i++) SR.aplicar(s, R, 'k' + i, { tipo: 'entrar', nome: 'R' + i });
    SR.aplicar(s, R, 'k0', { tipo: 'comecar' });
    let guarda = 0;
    while (s.fase === 'jogo' && guarda++ < 1000) {
      // todos jogam a peça da rodada, em ordem aleatória
      const ordem = s.jogadores.map((_, i) => i).sort(() => Math.random() - 0.5);
      for (const i of ordem) if (s.fase === 'jogo' && !s.jogadores[i].feito) robo(s, i);
    }
    if (s.fase !== 'fim') throw new Error('travou');
    rodadas += s.rodada + 1;
    s.jogadores.forEach((j) => {
      pts.push(R.pontos(j));
      chegadas += R.chegaram(j);
      if (R.chegaram(j) === R.QTD) completas++;
    });
  }
  pts.sort((a, b) => a - b);
  console.log(`${n} jogador(es): ~${Math.round(rodadas / JOGOS)} peças por partida, ${(chegadas / (JOGOS * n)).toFixed(1)} tropeiros chegam em média, ` +
    `${completas} expedições completas, pontos ${pts[0]}..${pts[pts.length - 1]} (mediana ${pts[Math.floor(pts.length / 2)]})`);
}
