// Expedição Sudoeste: cada jogador monta a SUA trilha num tabuleiro de 6 colunas x 5 linhas, mas todos recebem a MESMA peça
// ao mesmo tempo. Com a peça da rodada, cada um escolhe:
//   - colocar no seu tabuleiro (em qualquer casa vazia, podendo girar), OU
//   - descartar e andar com os tropeiros: tantos passos quantas saídas a peça tem (2, 3 ou 4).
// Cada um dos 4 tropeiros sai da borda de baixo/esquerda e precisa chegar ao destino da mesma cor
// (borda de cima/direita). Quem chega primeiro em cada destino ganha mais pontos (6, 5, 4...).
// Pinhão vale 2 e erva-mate vale 1 para quem passar pela casa. Termina quando alguém leva os 4
// tropeiros aos destinos (a rodada se completa) ou quando as 36 peças acabam.
(function (root) {
  var COL = 6; // colunas
  var LIN = 5; // linhas
  var DIRS = { N: [-1, 0], S: [1, 0], L: [0, 1], O: [0, -1] };
  var OPOSTO = { N: 'S', S: 'N', L: 'O', O: 'L' };
  var QTD = 4; // tropeiros por jogador
  var VALORES = [6, 5, 4, 3, 2];
  var DISTANCIA = 3; // distância mínima (em casas) entre a partida e o destino da mesma cor, como no original
  var NO_TEMPLO = 99;
  var NA_PARTIDA = -1;
  var TROPEIROS = [
    { nome: 'Laranja', cor: '#f97316', destino: 'Salto do Rio' },
    { nome: 'Azul-claro', cor: '#22d3ee', destino: 'Gruta' },
    { nome: 'Rosa', cor: '#f472b6', destino: 'Mirante' },
    { nome: 'Lima', cor: '#a3e635', destino: 'Capela' },
  ];

  // 36 peças fixas; só a ordem é sorteada. Saídas: N, S, L (leste/direita), O (oeste/esquerda).
  // Como no original, a maioria é reta ou curva (2 saídas): 24 de 2 saídas, 8 de 3 e 4 cruzamentos.
  var PECAS = [];
  function poe(saidas, vezes, itens) {
    for (var k = 0; k < vezes; k++) PECAS.push({ id: PECAS.length, saidas: saidas, item: (itens && itens[k]) || null });
  }
  poe('NS', 5, ['pinhao', 'erva']);
  poe('LO', 5, ['erva']);
  poe('NL', 4, ['pinhao', 'erva']);
  poe('SL', 3, ['erva']);
  poe('SO', 4, ['pinhao', 'erva']);
  poe('NO', 3, ['erva']);
  poe('NSL', 2, ['pinhao']);
  poe('SLO', 2, ['erva']);
  poe('NSO', 2, [null, 'erva']);
  poe('NLO', 2, ['pinhao']);
  poe('NSLO', 4, [null, 'erva']);

  function embaralhar(l) {
    for (var i = l.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = l[i];
      l[i] = l[j];
      l[j] = t;
    }
    return l;
  }
  function log(s, t) { root.SALA_REGRAS ? root.SALA_REGRAS.log(s, t) : require('../js/sala-regras.js').log(s, t); }

  // pontos de borda: partidas embaixo (S) e à esquerda (O); destinos em cima (N) e à direita (L)
  // { lado, i } -> casa vizinha do tabuleiro
  function casaDaBorda(p) {
    if (p.lado === 'S') return (LIN - 1) * COL + p.i;
    if (p.lado === 'O') return p.i * COL;
    if (p.lado === 'N') return p.i;
    return p.i * COL + (COL - 1); // L
  }
  function sortearBordas() {
    for (var tent = 0; tent < 500; tent++) {
      var ini = [];
      var fim = [];
      // S e N têm uma posição por coluna; O e L, uma por linha
      for (var x = 0; x < COL; x++) {
        ini.push('S' + x);
        fim.push('N' + x);
      }
      for (var y = 0; y < LIN; y++) {
        ini.push('O' + y);
        fim.push('L' + y);
      }
      embaralhar(ini);
      embaralhar(fim);
      var inicios = [];
      var templos = [];
      var usadasI = {};
      var usadasT = {};
      var k;
      for (k = 0; k < ini.length && inicios.length < QTD; k++) {
        var p = { lado: ini[k][0], i: Number(ini[k][1]) };
        if (usadasI[casaDaBorda(p)]) continue;
        usadasI[casaDaBorda(p)] = true;
        inicios.push(p);
      }
      for (k = 0; k < fim.length && templos.length < QTD; k++) {
        var q = { lado: fim[k][0], i: Number(fim[k][1]) };
        if (usadasT[casaDaBorda(q)]) continue;
        usadasT[casaDaBorda(q)] = true;
        templos.push(q);
      }
      // cada tropeiro precisa ficar longe do destino da mesma cor
      var ok = true;
      for (k = 0; k < QTD; k++) {
        var a = casaDaBorda(inicios[k]);
        var b = casaDaBorda(templos[k]);
        if (Math.abs(Math.floor(a / COL) - Math.floor(b / COL)) + Math.abs((a % COL) - (b % COL)) < DISTANCIA) ok = false;
      }
      if (ok) return { inicios: inicios, templos: templos };
    }
    return null;
  }

  function comecar(s) {
    var b = sortearBordas();
    s.inicios = b.inicios;
    s.templos = b.templos;
    s.valores = s.inicios.map(function () { return VALORES.slice(); });
    s.ordem = embaralhar(PECAS.map(function (p) { return p.id; }));
    s.rodada = 0;
    s.fase = 'jogo';
    s.vencedores = null;
    s.jogadores.forEach(function (j) {
      j.tab = [];
      for (var c = 0; c < COL * LIN; c++) j.tab.push(-1);
      j.exp = s.inicios.map(function () { return NA_PARTIDA; });
      j.coletados = [];
      j.ganhos = [];
      j.feito = false;
      j.ultima = null;
    });
    log(s, 'Começou! Peça 1 de 36.');
  }

  // o Firebase some com listas vazias e nulos: arruma depois de recarregar
  function normalizar(s) {
    s.valores = s.inicios.map(function (_, k) { return (s.valores && s.valores[k]) || []; });
    s.vencedores = s.vencedores || null;
    s.jogadores.forEach(function (j) {
      j.coletados = j.coletados || [];
      j.ganhos = j.ganhos || [];
      j.feito = !!j.feito;
      j.ultima = j.ultima || null;
    });
  }

  function pecaAtual(s) { return PECAS[s.ordem[s.rodada]]; }

  // no tabuleiro cada casa guarda peça*4 + giro (giro = quartos de volta no sentido do relógio); -1 = vazia
  var GIRA = { N: 'L', L: 'S', S: 'O', O: 'N' };
  function saidas(v, giro) {
    var id = giro === undefined ? Math.floor(v / 4) : v;
    var g = giro === undefined ? v % 4 : giro;
    var l = PECAS[id].saidas.split('');
    for (var k = 0; k < g; k++) l = l.map(function (d) { return GIRA[d]; });
    return l.join('');
  }
  function item(v) { return PECAS[Math.floor(v / 4)].item; }

  // para onde o tropeiro e pode dar UM passo (lista de casas; 99 = destino)
  function destinos(s, tab, exp, e) {
    var pos = exp[e];
    var livres = function (c) { return exp.indexOf(c) === -1; };
    var res = [];
    if (pos === NO_TEMPLO) return res;
    if (pos === NA_PARTIDA) {
      var ini = s.inicios[e];
      var c0 = casaDaBorda(ini);
      if (tab[c0] >= 0 && saidas(tab[c0]).indexOf(ini.lado) !== -1 && livres(c0)) res.push(c0);
      return res;
    }
    var r = Math.floor(pos / COL);
    var c = pos % COL;
    saidas(tab[pos]).split('').forEach(function (d) {
      var r2 = r + DIRS[d][0];
      var c2 = c + DIRS[d][1];
      if (r2 < 0 || r2 >= LIN || c2 < 0 || c2 >= COL) {
        var t = s.templos[e];
        var saiAqui = (d === 'N' && t.lado === 'N' && t.i === c) || (d === 'L' && t.lado === 'L' && t.i === r);
        if (saiAqui) res.push(NO_TEMPLO);
        return;
      }
      var alvo = r2 * COL + c2;
      if (tab[alvo] >= 0 && saidas(tab[alvo]).indexOf(OPOSTO[d]) !== -1 && livres(alvo)) res.push(alvo);
    });
    return res;
  }

  function pontos(j) {
    var p = 0;
    (j.ganhos || []).forEach(function (g) { p += g; });
    (j.coletados || []).forEach(function (c) {
      var it = item(j.tab[c]);
      p += it === 'pinhao' ? 2 : it === 'erva' ? 1 : 0;
    });
    return p;
  }
  function chegaram(j) { return j.exp.filter(function (x) { return x === NO_TEMPLO; }).length; }

  function terminar(s) {
    s.fase = 'fim';
    var placar = s.jogadores.map(function (j, i) { return { i: i, p: pontos(j), t: chegaram(j) }; });
    placar.sort(function (a, b) { return b.p - a.p || b.t - a.t; });
    s.vencedores = placar.filter(function (x) { return x.p === placar[0].p && x.t === placar[0].t; }).map(function (x) { return x.i; });
    log(s, 'Fim da expedição!');
  }

  function avancar(s) {
    if (!s.jogadores.every(function (j) { return j.feito; })) return;
    var completo = s.jogadores.some(function (j) { return chegaram(j) === QTD; });
    if (completo || s.rodada >= PECAS.length - 1) return terminar(s);
    s.rodada++;
    s.jogadores.forEach(function (j) { j.feito = false; });
    log(s, 'Peça ' + (s.rodada + 1) + ' de 36.');
  }

  function acao(s, idx, a) {
    if (s.fase !== 'jogo') return 'Agora não.';
    var j = s.jogadores[idx];
    if (j.feito) return 'Você já jogou essa peça. Espere os outros.';
    var peca = pecaAtual(s);

    if (a.tipo === 'colocar') {
      var c = Number(a.celula);
      if (!(c >= 0 && c < COL * LIN)) return 'Casa inválida.';
      if (j.tab[c] >= 0) return 'Essa casa já tem peça.';
      var giro = Number(a.giro) || 0;
      if (!(giro >= 0 && giro < 4)) return 'Giro inválido.';
      j.tab[c] = peca.id * 4 + giro;
      j.feito = true;
      j.ultima = { tipo: 'colocar', celula: c };
      avancar(s);
      return null;
    }

    if (a.tipo === 'descartar') {
      var passos = a.passos || [];
      if (passos.length > peca.saidas.length) return 'Essa peça dá só ' + peca.saidas.length + ' passos.';
      // valida tudo numa cópia antes de mexer de verdade
      var exp = j.exp.slice();
      for (var k = 0; k < passos.length; k++) {
        var e = Number(passos[k].e);
        var para = Number(passos[k].para);
        if (!(e >= 0 && e < QTD) || destinos(s, j.tab, exp, e).indexOf(para) === -1) return 'Caminho inválido.';
        exp[e] = para;
      }
      passos.forEach(function (ps) {
        var e2 = Number(ps.e);
        var p2 = Number(ps.para);
        j.exp[e2] = p2;
        if (p2 === NO_TEMPLO) {
          var v = s.valores[e2].shift() || 1;
          j.ganhos.push(v);
          log(s, j.nome + ' chegou ao ' + TROPEIROS[e2].destino + ' (+' + v + ')!');
        } else if (item(j.tab[p2]) && j.coletados.indexOf(p2) === -1) {
          j.coletados.push(p2);
        }
      });
      j.feito = true;
      j.ultima = { tipo: 'descartar', passos: passos.length };
      avancar(s);
      return null;
    }
    return 'Ação desconhecida.';
  }

  function publica(s) {
    return {
      inicios: s.inicios,
      templos: s.templos,
      valores: s.valores,
      rodada: s.rodada,
      peca: s.fase === 'jogo' ? s.ordem[s.rodada] : null,
      proximas: PECAS.length - s.rodada - 1,
      vencedores: s.vencedores || null,
      jogadores: s.jogadores.map(function (j) {
        return { tab: j.tab, exp: j.exp, coletados: j.coletados, ganhos: j.ganhos, feito: j.feito, ultima: j.ultima, pontos: pontos(j), chegaram: chegaram(j) };
      }),
    };
  }

  function privada(s) { return { versao: s.versao }; }

  var API = {
    COL: COL, LIN: LIN, QTD: QTD, DIRS: DIRS, PECAS: PECAS, TROPEIROS: TROPEIROS, NO_TEMPLO: NO_TEMPLO, NA_PARTIDA: NA_PARTIDA,
    min: 1, max: 5, comecar: comecar, acao: acao, publica: publica, privada: privada, normalizar: normalizar,
    destinos: destinos, saidas: saidas, item: item, casaDaBorda: casaDaBorda, pontos: pontos, chegaram: chegaram,
  };
  if (typeof module !== 'undefined') module.exports = API;
  else root.REGRAS_EXPEDICAO = API;
})(this);
