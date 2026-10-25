// Regras do Trilhos do Sudoeste. Roda na TV (que é a "mesa" e o juiz da partida).
// Todo o estado é um objeto simples (vai inteiro para o Firebase, para a TV poder recarregar).
//
// Na sua vez você faz UMA coisa:
//   1. Pegar 2 cartas (das 5 abertas ou do monte). Locomotiva aberta conta como as duas.
//   2. Ocupar uma rota: paga cartas da cor da rota (cinza = qualquer cor; locomotiva vale qualquer cor).
//   3. Pegar 3 bilhetes de destino e ficar com pelo menos 1.
// Quando alguém fica com 2 vagões ou menos, cada um joga mais uma vez e acaba.
// Final: pontos das rotas + bilhetes completos (− os incompletos) + 10 para o maior caminho.
(function (root) {
  var CORES = ['vermelho', 'azul', 'verde', 'amarelo', 'laranja', 'roxo', 'preto', 'branco'];
  var LOCO = 'loco';
  var PONTOS_ROTA = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 10, 6: 15 };
  var VAGOES = 30;
  var BONUS_CAMINHO = 10;
  var CORES_JOGADOR = ['#2563eb', '#dc2626', '#16a34a', '#eab308', '#9333ea'];
  var NOMES_COR_JOGADOR = ['Azul', 'Vermelho', 'Verde', 'Amarelo', 'Roxo'];

  function embaralhar(lista) {
    for (var i = lista.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = lista[i];
      lista[i] = lista[j];
      lista[j] = t;
    }
    return lista;
  }

  function novoEstado(codigo) {
    return { sala: codigo, fase: 'sala', jogadores: [], log: ['Sala criada. Entrem pelo celular!'], versao: 1 };
  }

  function addLog(s, txt) {
    s.log.push(txt);
    if (s.log.length > 6) s.log.shift();
  }

  function entrar(s, key, nome) {
    if (s.fase !== 'sala') return 'A partida já começou.';
    if (s.jogadores.some(function (j) { return j.key === key; })) return null;
    if (s.jogadores.length >= 5) return 'A sala está cheia (5 jogadores).';
    var i = s.jogadores.length;
    s.jogadores.push({ key: key, nome: String(nome || 'Jogador ' + (i + 1)).slice(0, 14), cor: CORES_JOGADOR[i], nomeCor: NOMES_COR_JOGADOR[i] });
    addLog(s, s.jogadores[i].nome + ' entrou.');
    return null;
  }

  function comecar(s, mapa) {
    if (s.fase !== 'sala' || s.jogadores.length < 2) return 'Precisa de pelo menos 2 jogadores.';
    var baralho = [];
    CORES.forEach(function (c) { for (var i = 0; i < 12; i++) baralho.push(c); });
    for (var l = 0; l < 14; l++) baralho.push(LOCO);
    s.baralho = embaralhar(baralho);
    s.descarte = [];
    s.bilhetes = embaralhar(mapa.bilhetes.map(function (b) { return b.id; }));
    s.donas = {}; // rota -> índice do jogador
    s.jogadores.forEach(function (j) {
      j.vagoes = VAGOES;
      j.pontos = 0;
      j.mao = {};
      for (var k = 0; k < 4; k++) darCarta(s, j, comprarDoMonte(s));
      j.meusBilhetes = [];
      j.pendentes = s.bilhetes.splice(0, 3);
      j.minimo = 2;
    });
    s.abertas = [];
    reporAbertas(s);
    s.fase = 'bilhetes';
    s.vez = 0;
    s.compradas = 0;
    s.ultimaVolta = null;
    addLog(s, 'Cada um escolhe os bilhetes de destino no celular.');
    return null;
  }

  function comprarDoMonte(s) {
    if (!s.baralho.length) {
      s.baralho = embaralhar(s.descarte);
      s.descarte = [];
    }
    return s.baralho.pop() || null;
  }

  function darCarta(s, j, c) {
    if (c) j.mao[c] = (j.mao[c] || 0) + 1;
  }

  function reporAbertas(s) {
    for (var tent = 0; tent < 4; tent++) {
      while (s.abertas.length < 5) {
        var c = comprarDoMonte(s);
        if (!c) break;
        s.abertas.push(c);
      }
      // 3 locomotivas abertas: descarta tudo e repõe
      var locos = s.abertas.filter(function (c) { return c === LOCO; }).length;
      if (locos < 3) return;
      s.descarte = s.descarte.concat(s.abertas);
      s.abertas = [];
    }
  }

  function totalCartas(j) {
    var n = 0;
    for (var c in j.mao) n += j.mao[c];
    return n;
  }

  // ---------- ações ----------

  function escolherBilhetes(s, j, ficar, mapa) {
    if (!j.pendentes || !j.pendentes.length) return 'Nenhum bilhete para escolher.';
    ficar = (ficar || []).filter(function (id) { return j.pendentes.indexOf(id) !== -1; });
    if (ficar.length < j.minimo) return 'Fique com pelo menos ' + j.minimo + '.';
    j.meusBilhetes = j.meusBilhetes.concat(ficar);
    var devolver = j.pendentes.filter(function (id) { return ficar.indexOf(id) === -1; });
    s.bilhetes = s.bilhetes.concat(devolver); // vão para o fundo do monte
    j.pendentes = [];
    if (s.fase === 'bilhetes') {
      if (s.jogadores.every(function (q) { return !q.pendentes.length; })) {
        s.fase = 'jogo';
        addLog(s, 'Começou! Vez de ' + s.jogadores[s.vez].nome + '.');
      }
    } else {
      addLog(s, j.nome + ' ficou com ' + ficar.length + ' bilhete(s) novo(s).');
      fimDaVez(s, mapa);
    }
    return null;
  }

  function comprarAberta(s, j, idx, mapa) {
    var c = s.abertas[idx];
    if (!c) return 'Carta inválida.';
    if (c === LOCO && s.compradas > 0) return 'Locomotiva aberta só pode ser a primeira compra.';
    s.abertas.splice(idx, 1);
    darCarta(s, j, c);
    reporAbertas(s);
    s.compradas += c === LOCO ? 2 : 1;
    addLog(s, j.nome + ' pegou ' + (c === LOCO ? 'uma locomotiva' : 'um ' + c) + ' da mesa.');
    if (s.compradas >= 2) fimDaVez(s, mapa);
    return null;
  }

  function comprarMonte(s, j, mapa) {
    var c = comprarDoMonte(s);
    if (!c) return 'O monte acabou.';
    darCarta(s, j, c);
    s.compradas += 1;
    addLog(s, j.nome + ' pegou uma carta do monte.');
    if (s.compradas >= 2) fimDaVez(s, mapa);
    return null;
  }

  // a rota pode ser ocupada? (dupla: com menos de 4 jogadores só uma das duas; e nunca as duas pela mesma pessoa)
  function rotaLivre(s, mapa, r, idxJogador) {
    if (s.donas[r.id] !== undefined) return false;
    var gemea = mapa.rotas.filter(function (q) { return q.id !== r.id && ((q.a === r.a && q.b === r.b) || (q.a === r.b && q.b === r.a)); })[0];
    if (gemea && s.donas[gemea.id] !== undefined) {
      if (s.jogadores.length < 4) return false;
      if (s.donas[gemea.id] === idxJogador) return false;
    }
    return true;
  }

  // como pagar a rota com a cor escolhida: usa cartas da cor e completa com locomotivas
  function pagamento(j, r, cor) {
    if (cor === LOCO) return (j.mao[LOCO] || 0) >= r.n ? { cor: LOCO, daCor: 0, locos: r.n } : null;
    if (r.cor !== 'cinza' && cor !== r.cor) return null;
    var daCor = Math.min(j.mao[cor] || 0, r.n);
    var locos = r.n - daCor;
    if ((j.mao[LOCO] || 0) < locos) return null;
    return { cor: cor, daCor: daCor, locos: locos };
  }

  // todas as formas possíveis de pagar (para o celular mostrar as opções)
  function opcoesPagamento(j, r) {
    var cores = r.cor === 'cinza' ? CORES : [r.cor];
    var out = [];
    cores.forEach(function (c) {
      var p = pagamento(j, r, c);
      if (p && p.daCor > 0) out.push(p);
    });
    var soLoco = pagamento(j, r, LOCO);
    if (soLoco) out.push(soLoco);
    return out;
  }

  function ocupar(s, j, idx, rotaId, cor, mapa) {
    if (s.compradas > 0) return 'Você já começou a pegar cartas nesta vez.';
    var r = mapa.rotas[rotaId];
    if (!r || !rotaLivre(s, mapa, r, idx)) return 'Essa rota não está disponível.';
    if (j.vagoes < r.n) return 'Você não tem vagões suficientes.';
    var p = pagamento(j, r, cor);
    if (!p) return 'Cartas insuficientes para essa rota.';
    if (p.daCor) j.mao[p.cor] -= p.daCor;
    if (p.locos) j.mao[LOCO] -= p.locos;
    for (var k = 0; k < p.daCor; k++) s.descarte.push(p.cor);
    for (var m = 0; m < p.locos; m++) s.descarte.push(LOCO);
    s.donas[r.id] = idx;
    j.vagoes -= r.n;
    j.pontos += PONTOS_ROTA[r.n];
    s.ultimaRota = { id: r.id, jogador: idx, n: (s.ultimaRota ? s.ultimaRota.n : 0) + 1 };
    addLog(s, j.nome + ' ocupou ' + mapa.cidades[r.a].nome + ' — ' + mapa.cidades[r.b].nome + ' (+' + PONTOS_ROTA[r.n] + ').');
    fimDaVez(s, mapa);
    return null;
  }

  function pedirBilhetes(s, j) {
    if (s.compradas > 0) return 'Você já começou a pegar cartas nesta vez.';
    if (!s.bilhetes.length) return 'Os bilhetes acabaram.';
    j.pendentes = s.bilhetes.splice(0, 3);
    j.minimo = 1;
    addLog(s, j.nome + ' está escolhendo bilhetes...');
    return null;
  }

  function fimDaVez(s, mapa) {
    var j = s.jogadores[s.vez];
    s.compradas = 0;
    if (s.ultimaVolta === null && j.vagoes <= 2) {
      s.ultimaVolta = s.vez;
      addLog(s, j.nome + ' está quase sem vagões: última volta para todos!');
    } else if (s.ultimaVolta !== null && s.vez === s.ultimaVolta) {
      // quem disparou a última volta acabou de jogar a vez final dele
      return terminar(s, mapa);
    }
    s.vez = (s.vez + 1) % s.jogadores.length;
    addLog(s, 'Vez de ' + s.jogadores[s.vez].nome + '.');
  }

  // ---------- final ----------

  function conectados(s, mapa, idx) {
    var pai = mapa.cidades.map(function (c, i) { return i; });
    function raiz(x) { while (pai[x] !== x) x = pai[x] = pai[pai[x]]; return x; }
    mapa.rotas.forEach(function (r) {
      if (s.donas[r.id] === idx) pai[raiz(r.a)] = raiz(r.b);
    });
    return function (a, b) { return raiz(a) === raiz(b); };
  }

  function bilheteCompleto(s, mapa, idx, bilheteId) {
    var b = mapa.bilhetes[bilheteId];
    return conectados(s, mapa, idx)(b.a, b.b);
  }

  // maior caminho contínuo (sem repetir trilho) de um jogador, em vagões
  function maiorCaminho(s, mapa, idx) {
    var minhas = mapa.rotas.filter(function (r) { return s.donas[r.id] === idx; });
    var melhor = 0;
    function dfs(cidade, usadas, total) {
      if (total > melhor) melhor = total;
      minhas.forEach(function (r) {
        if (usadas[r.id] || (r.a !== cidade && r.b !== cidade)) return;
        usadas[r.id] = true;
        dfs(r.a === cidade ? r.b : r.a, usadas, total + r.n);
        usadas[r.id] = false;
      });
    }
    mapa.cidades.forEach(function (c) { dfs(c.id, {}, 0); });
    return melhor;
  }

  function terminar(s, mapa) {
    s.fase = 'fim';
    var caminhos = s.jogadores.map(function (j, i) { return maiorCaminho(s, mapa, i); });
    var maior = Math.max.apply(null, caminhos);
    s.resultado = s.jogadores.map(function (j, i) {
      var feitos = 0;
      var perdidos = 0;
      j.meusBilhetes.forEach(function (id) {
        if (bilheteCompleto(s, mapa, i, id)) feitos += mapa.bilhetes[id].pontos;
        else perdidos += mapa.bilhetes[id].pontos;
      });
      var bonus = caminhos[i] === maior && maior > 0 ? BONUS_CAMINHO : 0;
      return { rotas: j.pontos, bilhetes: feitos, perdidos: perdidos, caminho: caminhos[i], bonus: bonus, total: j.pontos + feitos - perdidos + bonus };
    });
    var top = Math.max.apply(null, s.resultado.map(function (r) { return r.total; }));
    s.vencedores = s.resultado.map(function (r, i) { return r.total === top ? i : -1; }).filter(function (i) { return i >= 0; });
    addLog(s, 'Fim de jogo! Veja a contagem na TV.');
  }

  // ---------- entrada única de ações (vindas dos celulares) ----------

  function aplicar(s, mapa, key, acao) {
    var idx = -1;
    for (var i = 0; i < s.jogadores.length; i++) if (s.jogadores[i].key === key) idx = i;
    if (acao.tipo === 'entrar') return entrar(s, key, acao.nome);
    if (idx === -1) return 'Jogador não encontrado.';
    var j = s.jogadores[idx];
    if (acao.tipo === 'comecar') return idx === 0 ? comecar(s, mapa) : 'Só o primeiro jogador começa.';
    if (acao.tipo === 'escolherBilhetes') {
      if (s.fase === 'jogo' && idx !== s.vez) return 'Não é sua vez.';
      return escolherBilhetes(s, j, acao.ficar, mapa);
    }
    if (s.fase !== 'jogo') return 'Agora não.';
    if (idx !== s.vez) return 'Não é sua vez.';
    if (j.pendentes && j.pendentes.length) return 'Escolha seus bilhetes primeiro.';
    if (acao.tipo === 'comprarAberta') return comprarAberta(s, j, acao.idx | 0, mapa);
    if (acao.tipo === 'comprarMonte') return comprarMonte(s, j, mapa);
    if (acao.tipo === 'ocupar') return ocupar(s, j, idx, acao.rota | 0, acao.cor, mapa);
    if (acao.tipo === 'pedirBilhetes') return pedirBilhetes(s, j);
    return 'Ação desconhecida.';
  }

  // o que todos podem ver (TV e celulares): nada de mãos nem bilhetes alheios
  function visaoPublica(s, mapa) {
    var fim = s.fase === 'fim';
    return {
      sala: s.sala,
      fase: s.fase,
      vez: s.vez === undefined ? null : s.vez,
      compradas: s.compradas || 0,
      ultimaVolta: s.ultimaVolta === undefined ? null : s.ultimaVolta,
      abertas: s.abertas || [],
      monte: s.baralho ? s.baralho.length : 0,
      bilhetesNoMonte: s.bilhetes ? s.bilhetes.length : 0,
      donas: s.donas || {},
      ultimaRota: s.ultimaRota || null,
      log: s.log,
      jogadores: s.jogadores.map(function (j, i) {
        return {
          tag: j.key.slice(-4), // o celular se reconhece por isso (a chave inteira fica secreta)
          nome: j.nome, cor: j.cor, nomeCor: j.nomeCor, pontos: j.pontos || 0, vagoes: j.vagoes === undefined ? VAGOES : j.vagoes,
          cartas: j.mao ? totalCartas(j) : 0, bilhetes: j.meusBilhetes ? j.meusBilhetes.length : 0,
          escolhendo: !!(j.pendentes && j.pendentes.length),
          bilhetesFim: fim ? j.meusBilhetes.map(function (id) { return { id: id, ok: bilheteCompleto(s, mapa, i, id) }; }) : null,
        };
      }),
      resultado: s.resultado || null,
      vencedores: s.vencedores || null,
      versao: s.versao,
    };
  }

  // o que só o dono do celular vê: a mão, os bilhetes e as rotas que ele consegue ocupar agora
  function visaoPrivada(s, mapa, idx) {
    var j = s.jogadores[idx];
    var minha = s.fase === 'jogo' && s.vez === idx;
    var possiveis = [];
    if (minha && !s.compradas && j.mao) {
      mapa.rotas.forEach(function (r) {
        if (!rotaLivre(s, mapa, r, idx) || j.vagoes < r.n) return;
        var op = opcoesPagamento(j, r);
        if (op.length) possiveis.push({ rota: r.id, opcoes: op.map(function (o) { return o.cor; }) });
      });
    }
    return {
      indice: idx,
      mao: j.mao || {},
      bilhetes: (j.meusBilhetes || []).map(function (id) { return { id: id, ok: bilheteCompleto(s, mapa, idx, id) }; }),
      pendentes: j.pendentes || [],
      minimo: j.minimo || 1,
      possiveis: possiveis,
      versao: s.versao,
    };
  }

  var API = {
    CORES: CORES, LOCO: LOCO, PONTOS_ROTA: PONTOS_ROTA, VAGOES: VAGOES,
    novoEstado: novoEstado, aplicar: aplicar, visaoPublica: visaoPublica, visaoPrivada: visaoPrivada,
    rotaLivre: rotaLivre, maiorCaminho: maiorCaminho,
  };
  if (typeof module !== 'undefined') module.exports = API;
  else root.REGRAS = API;
})(this);
