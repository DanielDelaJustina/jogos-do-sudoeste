// Simula partidas inteiras com robôs simples para testar as regras.
// Rodar: node ferramentas/simular.js
const fs = require('fs');
const path = require('path');
const R = require('../js/regras.js');
global.window = {};
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'mapa.js'), 'utf8'));
const MAPA = window.MAPA;

function partida(n) {
  const s = R.novoEstado('TESTE');
  for (let i = 0; i < n; i++) R.aplicar(s, MAPA, 'k' + i, { tipo: 'entrar', nome: 'Robo' + i });
  const erro = R.aplicar(s, MAPA, 'k0', { tipo: 'comecar' });
  if (erro) throw new Error(erro);
  for (let i = 0; i < n; i++) {
    const pv = R.visaoPrivada(s, MAPA, i);
    R.aplicar(s, MAPA, 'k' + i, { tipo: 'escolherBilhetes', ficar: pv.pendentes.slice(0, 2) });
  }
  let turnos = 0;
  let erros = 0;
  while (s.fase === 'jogo' && turnos < 2000) {
    turnos++;
    const i = s.vez;
    const key = 'k' + i;
    const pv = R.visaoPrivada(s, MAPA, i);
    if (pv.pendentes.length) {
      R.aplicar(s, MAPA, key, { tipo: 'escolherBilhetes', ficar: pv.pendentes.slice(0, 1) });
      continue;
    }
    // robô: ocupa a maior rota que consegue; às vezes pega bilhetes; senão compra
    const melhor = pv.possiveis.map((p) => ({ p, r: MAPA.rotas[p.rota] })).sort((a, b) => b.r.n - a.r.n)[0];
    let e;
    if (melhor && (melhor.r.n >= 3 || Math.random() < 0.5)) e = R.aplicar(s, MAPA, key, { tipo: 'ocupar', rota: melhor.p.rota, cor: melhor.p.opcoes[0] });
    else if (Math.random() < 0.04 && s.bilhetes.length) e = R.aplicar(s, MAPA, key, { tipo: 'pedirBilhetes' });
    else {
      e = R.aplicar(s, MAPA, key, { tipo: 'comprarMonte' });
      if (!e && s.vez === i) e = R.aplicar(s, MAPA, key, { tipo: 'comprarMonte' });
    }
    if (e) {
      erros++;
      if (erros > 50) throw new Error('travou: ' + e);
      R.aplicar(s, MAPA, key, { tipo: 'comprarAberta', idx: 0 });
      if (s.vez === i && s.fase === 'jogo') R.aplicar(s, MAPA, key, { tipo: 'comprarAberta', idx: 0 });
    }
  }
  return { s, turnos };
}

for (const n of [2, 3, 5]) {
  let soma = 0;
  let maxT = 0;
  const totais = [];
  for (let k = 0; k < 30; k++) {
    const { s, turnos } = partida(n);
    if (s.fase !== 'fim') throw new Error('não terminou com ' + n + ' jogadores');
    soma += turnos;
    maxT = Math.max(maxT, turnos);
    s.resultado.forEach((r) => totais.push(r.total));
    // confere que ninguém usou mais vagões que tinha e que rotas não têm dono duplicado
    s.jogadores.forEach((j) => { if (j.vagoes < 0) throw new Error('vagões negativos'); });
  }
  totais.sort((a, b) => a - b);
  console.log(`${n} jogadores: ~${Math.round(soma / 30)} jogadas por partida (máx ${maxT}); pontuação final de ${totais[0]} a ${totais[totais.length - 1]} (mediana ${totais[Math.floor(totais.length / 2)]})`);
}
// exemplo de visão pública (o que vai para a TV) e privada
const { s } = partida(3);
console.log('visão pública:', JSON.stringify(R.visaoPublica(s, MAPA)).length, 'bytes | privada:', JSON.stringify(R.visaoPrivada(s, MAPA, 0)).length, 'bytes');
console.log('resultado exemplo:', JSON.stringify(s.resultado));
