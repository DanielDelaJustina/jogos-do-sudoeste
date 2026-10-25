// Safra do Sudoeste: junte produtos da região, compre negócios (que dão desconto para sempre)
// e receba visitas de feiras. Quem chegar a 15 pontos encerra a rodada; mais pontos vence.
//
// Na sua vez, UMA ação:
//   - pegar 3 produtos diferentes, OU 2 iguais (se a pilha tiver 4 ou mais);
//   - reservar um negócio (da mesa ou do monte) e ganhar 1 crédito (máximo 3 reservados);
//   - comprar um negócio da mesa ou reservado (descontos dos seus negócios + crédito como coringa).
// Limite de 10 fichas na mão (devolve o excesso). Feiras visitam sozinhas quem tiver os negócios pedidos.
(function (root) {
  var PRODUTOS = ['leite', 'milho', 'soja', 'suino', 'erva'];
  var NOMES = { leite: 'Leite', milho: 'Milho', soja: 'Soja', suino: 'Suíno', erva: 'Erva-mate', credito: 'Crédito' };
  var META = 15;
  var LIMITE = 10;

  // padrões de custo por nível: chaves o0..o3 = os outros produtos (girados), "p" = o próprio produto
  var PADROES = {
    1: [[{ o0: 1, o1: 1, o2: 1, o3: 1 }, 0], [{ o0: 1, o1: 2, o2: 1, o3: 1 }, 0], [{ o0: 2, o1: 2, o3: 1 }, 0], [{ o0: 3 }, 0],
      [{ o0: 2, o2: 1 }, 0], [{ o1: 2, o2: 2 }, 0], [{ o0: 1, o1: 3, p: 1 }, 0], [{ o2: 4 }, 1]],
    2: [[{ o0: 2, o1: 2, o2: 3 }, 1], [{ o1: 3, o3: 2, p: 2 }, 1], [{ o0: 1, o1: 4, o2: 2 }, 2], [{ o0: 5 }, 2],
      [{ o2: 5, o3: 3 }, 2], [{ p: 6 }, 3]],
    3: [[{ o0: 3, o1: 3, o2: 5, o3: 3 }, 3], [{ o0: 7 }, 4], [{ o0: 6, o1: 3, p: 3 }, 4], [{ o0: 7, p: 3 }, 5]],
  };
  var NOMES_NEGOCIO = {
    1: { leite: 'Ordenha', milho: 'Paiol', soja: 'Roça de soja', suino: 'Chiqueiro', erva: 'Barbaquá' },
    2: { leite: 'Laticínio', milho: 'Silo', soja: 'Armazém', suino: 'Granja', erva: 'Ervateira' },
    3: { leite: 'Indústria de queijos', milho: 'Moinho regional', soja: 'Exportadora', suino: 'Frigorífico', erva: 'Cooperativa da erva' },
  };

  var CARTAS = [];
  [1, 2, 3].forEach(function (nivel) {
    PRODUTOS.forEach(function (prod, pi) {
      var outros = PRODUTOS.filter(function (x) { return x !== prod; });
      PADROES[nivel].forEach(function (pad, k) {
        var giro = (pi + k) % 4;
        var custo = {};
        for (var chave in pad[0]) {
          var alvo = chave === 'p' ? prod : outros[(Number(chave.slice(1)) + giro) % 4];
          custo[alvo] = (custo[alvo] || 0) + pad[0][chave];
        }
        CARTAS.push({ id: CARTAS.length, nivel: nivel, bonus: prod, pontos: pad[1], custo: custo, nome: NOMES_NEGOCIO[nivel][prod] });
      });
    });
  });

  // feiras: pedem negócios (bônus) e valem 3 pontos
  var CIDADES = ['Pato Branco', 'Francisco Beltrão', 'Dois Vizinhos', 'Verê', "Itapejara d'Oeste", 'Coronel Vivida', 'Chopinzinho', 'Palmas', 'Realeza', 'Capanema'];
  var FEIRAS = [];
  for (var f = 0; f < 5; f++) {
    var a = PRODUTOS[f];
    var b = PRODUTOS[(f + 1) % 5];
    var c = PRODUTOS[(f + 2) % 5];
    var r1 = {};
    r1[a] = 4;
    r1[b] = 4;
    FEIRAS.push({ id: FEIRAS.length, pede: r1, nome: 'Feira de ' + CIDADES[FEIRAS.length] });
    var r2 = {};
    r2[a] = 3;
    r2[c] = 3;
    r2[PRODUTOS[(f + 3) % 5]] = 3;
    FEIRAS.push({ id: FEIRAS.length, pede: r2, nome: 'Feira de ' + CIDADES[FEIRAS.length] });
  }

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

  function soma(o) {
    var n = 0;
    for (var k in o) n += o[k] || 0;
    return n;
  }

  function bonus(j) {
    var b = {};
    PRODUTOS.forEach(function (p) { b[p] = 0; });
    (j.cartas || []).forEach(function (id) { b[CARTAS[id].bonus]++; });
    return b;
  }

  function pontos(j) {
    var p = 0;
    (j.cartas || []).forEach(function (id) { p += CARTAS[id].pontos; });
    return p + (j.feiras || []).length * 3;
  }

  function comecar(s) {
    var n = s.jogadores.length;
    var qtd = n <= 2 ? 4 : n === 3 ? 5 : 7;
    s.fichas = { credito: 5 };
    PRODUTOS.forEach(function (p) { s.fichas[p] = qtd; });
    s.montes = {};
    s.mesa = {};
    [1, 2, 3].forEach(function (nv) {
      s.montes[nv] = embaralhar(CARTAS.filter(function (c) { return c.nivel === nv; }).map(function (c) { return c.id; }));
      s.mesa[nv] = s.montes[nv].splice(0, 4);
    });
    s.feiras = embaralhar(FEIRAS.map(function (x) { return x.id; })).slice(0, n + 1);
    s.jogadores.forEach(function (j) {
      j.fichas = { credito: 0 };
      PRODUTOS.forEach(function (p) { j.fichas[p] = 0; });
      j.cartas = [];
      j.reservadas = [];
      j.feiras = [];
    });
    s.fase = 'jogo';
    s.vez = 0;
    s.devolvendo = false;
    s.ultimaRodada = false;
    log(s, 'Começou! Vez de ' + s.jogadores[0].nome + '.');
    return null;
  }

  function normalizar(s) {
    s.fichas = s.fichas || {};
    s.montes = s.montes || {};
    s.mesa = s.mesa || {};
    [1, 2, 3].forEach(function (nv) {
      s.montes[nv] = s.montes[nv] || [];
      s.mesa[nv] = s.mesa[nv] || [];
    });
    s.feiras = s.feiras || [];
    s.jogadores.forEach(function (j) {
      j.fichas = j.fichas || {};
      ['credito'].concat(PRODUTOS).forEach(function (p) { j.fichas[p] = j.fichas[p] || 0; s.fichas[p] = s.fichas[p] || 0; });
      j.cartas = j.cartas || [];
      j.reservadas = j.reservadas || [];
      j.feiras = j.feiras || [];
    });
  }

  // quanto falta de cada produto para comprar (já usando descontos e créditos)
  function analisar(j, carta) {
    var b = bonus(j);
    var faltaTotal = 0;
    var paga = {};
    PRODUTOS.forEach(function (p) {
      var precisa = Math.max(0, (carta.custo[p] || 0) - b[p]);
      var tenho = j.fichas[p] || 0;
      paga[p] = Math.min(precisa, tenho);
      faltaTotal += Math.max(0, precisa - tenho);
    });
    return { pode: faltaTotal <= (j.fichas.credito || 0), credito: faltaTotal, paga: paga, falta: Math.max(0, faltaTotal - (j.fichas.credito || 0)) };
  }

  function repor(s, nivel, pos) {
    var nova = s.montes[nivel].shift();
    if (nova === undefined) s.mesa[nivel].splice(pos, 1);
    else s.mesa[nivel][pos] = nova;
  }

  function acao(s, idx, a) {
    if (s.fase !== 'jogo') return 'Agora não.';
    if (idx !== s.vez) return 'Não é sua vez.';
    var j = s.jogadores[idx];

    if (a.tipo === 'devolver') {
      if (!s.devolvendo) return 'Nada para devolver.';
      if (!j.fichas[a.produto]) return 'Você não tem essa ficha.';
      j.fichas[a.produto]--;
      s.fichas[a.produto]++;
      if (soma(j.fichas) <= LIMITE) {
        s.devolvendo = false;
        fimDaVez(s);
      }
      return null;
    }
    if (s.devolvendo) return 'Devolva fichas até ficar com 10.';

    if (a.tipo === 'pegar') {
      var lista = (a.produtos || []).filter(function (p) { return PRODUTOS.indexOf(p) !== -1; });
      if (!lista.length) return 'Escolha os produtos.';
      if (lista.length === 2 && lista[0] === lista[1]) {
        if (s.fichas[lista[0]] < 4) return 'Só dá para pegar 2 iguais se a pilha tiver 4 ou mais.';
      } else {
        var dif = {};
        lista.forEach(function (p) { dif[p] = 1; });
        if (Object.keys(dif).length !== lista.length) return 'Pegue produtos diferentes (ou 2 iguais).';
        if (lista.length > 3) return 'No máximo 3 produtos.';
        var disponiveis = PRODUTOS.filter(function (p) { return s.fichas[p] > 0; }).length;
        if (lista.length < Math.min(3, disponiveis)) return 'Pegue 3 produtos diferentes (ou 2 iguais).';
        for (var i = 0; i < lista.length; i++) if (s.fichas[lista[i]] <= 0) return 'Acabou ' + NOMES[lista[i]] + '.';
      }
      lista.forEach(function (p) {
        s.fichas[p]--;
        j.fichas[p]++;
      });
      log(s, j.nome + ' pegou ' + lista.map(function (p) { return NOMES[p]; }).join(', ') + '.');
      return depoisDePegar(s, j);
    }

    if (a.tipo === 'reservar') {
      if (j.reservadas.length >= 3) return 'Você já tem 3 negócios reservados.';
      var id = null;
      if (a.nivel) {
        if (!s.montes[a.nivel] || !s.montes[a.nivel].length) return 'Esse monte acabou.';
        id = s.montes[a.nivel].shift();
        log(s, j.nome + ' reservou um negócio do monte ' + a.nivel + '.');
      } else {
        var achou = acharNaMesa(s, a.carta);
        if (!achou) return 'Esse negócio não está na mesa.';
        id = a.carta;
        repor(s, achou.nivel, achou.pos);
        log(s, j.nome + ' reservou ' + CARTAS[id].nome + '.');
      }
      j.reservadas.push(id);
      if (s.fichas.credito > 0) {
        s.fichas.credito--;
        j.fichas.credito++;
      }
      return depoisDePegar(s, j);
    }

    if (a.tipo === 'comprar') {
      var carta = CARTAS[a.carta];
      if (!carta) return 'Negócio inválido.';
      var naMesa = acharNaMesa(s, a.carta);
      var reservada = j.reservadas.indexOf(a.carta);
      if (!naMesa && reservada === -1) return 'Esse negócio não está disponível para você.';
      var an = analisar(j, carta);
      if (!an.pode) return 'Faltam ' + an.falta + ' produto(s) para esse negócio.';
      PRODUTOS.forEach(function (p) {
        j.fichas[p] -= an.paga[p];
        s.fichas[p] += an.paga[p];
      });
      j.fichas.credito -= an.credito;
      s.fichas.credito += an.credito;
      if (naMesa) repor(s, naMesa.nivel, naMesa.pos);
      else j.reservadas.splice(reservada, 1);
      j.cartas.push(carta.id);
      log(s, j.nome + ' comprou ' + carta.nome + (carta.pontos ? ' (+' + carta.pontos + ')' : '') + '.');
      s.ultimaCompra = { carta: carta.id, jogador: idx, n: (s.ultimaCompra ? s.ultimaCompra.n : 0) + 1 };
      fimDaVez(s);
      return null;
    }
    return 'Ação desconhecida.';
  }

  function acharNaMesa(s, id) {
    for (var nv = 1; nv <= 3; nv++) {
      var pos = s.mesa[nv].indexOf(id);
      if (pos !== -1) return { nivel: nv, pos: pos };
    }
    return null;
  }

  function depoisDePegar(s, j) {
    if (soma(j.fichas) > LIMITE) {
      s.devolvendo = true;
      log(s, j.nome + ' está com mais de 10 fichas e precisa devolver.');
      return null;
    }
    fimDaVez(s);
    return null;
  }

  function fimDaVez(s) {
    var j = s.jogadores[s.vez];
    // feira visita quem tem os negócios pedidos (uma por vez)
    var b = bonus(j);
    for (var i = 0; i < s.feiras.length; i++) {
      var fe = FEIRAS[s.feiras[i]];
      var ok = true;
      for (var p in fe.pede) if (b[p] < fe.pede[p]) ok = false;
      if (ok) {
        j.feiras.push(fe.id);
        s.feiras.splice(i, 1);
        log(s, 'A ' + fe.nome + ' visitou ' + j.nome + ' (+3)!');
        s.ultimaFeira = { feira: fe.id, jogador: s.vez, n: (s.ultimaFeira ? s.ultimaFeira.n : 0) + 1 };
        break;
      }
    }
    if (!s.ultimaRodada && pontos(j) >= META) {
      s.ultimaRodada = true;
      log(s, j.nome + ' chegou a ' + META + ' pontos! Última rodada.');
    }
    s.vez = (s.vez + 1) % s.jogadores.length;
    // a rodada termina quando volta para o primeiro jogador (todos jogam o mesmo número de vezes)
    if (s.ultimaRodada && s.vez === 0) return terminar(s);
    log(s, 'Vez de ' + s.jogadores[s.vez].nome + '.');
  }

  function terminar(s) {
    s.fase = 'fim';
    var placar = s.jogadores.map(function (j, i) { return { i: i, pontos: pontos(j), cartas: j.cartas.length }; });
    placar.sort(function (x, y) { return y.pontos - x.pontos || x.cartas - y.cartas; });
    var top = placar[0];
    s.vencedores = placar.filter(function (p) { return p.pontos === top.pontos && p.cartas === top.cartas; }).map(function (p) { return p.i; });
    log(s, 'Fim de jogo!');
  }

  function publica(s) {
    return {
      fichas: s.fichas,
      mesa: s.mesa,
      montes: { 1: s.montes[1].length, 2: s.montes[2].length, 3: s.montes[3].length },
      feiras: s.feiras,
      vez: s.vez,
      devolvendo: !!s.devolvendo,
      ultimaRodada: !!s.ultimaRodada,
      ultimaCompra: s.ultimaCompra || null,
      ultimaFeira: s.ultimaFeira || null,
      vencedores: s.vencedores || null,
      jogadores: s.jogadores.map(function (j) {
        return { pontos: pontos(j), fichas: j.fichas, bonus: bonus(j), reservadas: j.reservadas.length, cartas: j.cartas.length, feiras: j.feiras };
      }),
    };
  }

  function privada(s, idx) {
    var j = s.jogadores[idx];
    var info = {};
    var ver = [];
    [1, 2, 3].forEach(function (nv) { ver = ver.concat(s.mesa[nv]); });
    ver.concat(j.reservadas).forEach(function (id) {
      var an = analisar(j, CARTAS[id]);
      info[id] = { pode: an.pode, falta: an.falta };
    });
    return { reservadas: j.reservadas, compra: info, versao: s.versao };
  }

  var API = {
    PRODUTOS: PRODUTOS, NOMES: NOMES, CARTAS: CARTAS, FEIRAS: FEIRAS, META: META, LIMITE: LIMITE,
    min: 2, max: 4, comecar: comecar, acao: acao, publica: publica, privada: privada, normalizar: normalizar,
    pontos: pontos, bonus: bonus,
  };
  if (typeof module !== 'undefined') module.exports = API;
  else root.REGRAS_SAFRA = API;
})(this);
