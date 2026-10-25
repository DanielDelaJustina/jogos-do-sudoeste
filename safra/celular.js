// Celular do Safra: suas fichas e descontos, escolher produtos, comprar e reservar negócios.
(function () {
  var R = window.REGRAS_SAFRA;
  var COR = { leite: '#f1f5f9', milho: '#facc15', soja: '#a3e635', suino: '#f9a8d4', erva: '#4ade80', credito: '#d4a017' };
  var EMOJI = { leite: '🥛', milho: '🌽', soja: '🫘', suino: '🐷', erva: '🧉', credito: '💰' };
  var selecao = []; // produtos escolhidos para pegar

  function fichaHtml(p, n, attrs) {
    var tag = attrs ? 'button' : 'div';
    return '<' + tag + ' class="ficha" style="background:' + COR[p] + '" ' + (attrs || '') + '>' + EMOJI[p] +
      (n !== undefined ? '<b>' + n + '</b>' : '') + '</' + tag + '>';
  }

  function custoHtml(c) {
    return Object.keys(c.custo).map(function (p) { return '<span>' + EMOJI[p] + ' ' + c.custo[p] + '</span>'; }).join('');
  }

  // regras da escolha: 3 diferentes, ou tocar 2x no mesmo para pegar 2 iguais (pilha com 4+)
  function tocarProduto(p, pub) {
    var i = selecao.indexOf(p);
    if (selecao.length === 1 && selecao[0] === p && pub.fichas[p] >= 4) selecao.push(p);
    else if (i !== -1) selecao = selecao.filter(function (x) { return x !== p; });
    else if (selecao.length === 2 && selecao[0] === selecao[1]) selecao = [p];
    else if (selecao.length < 3) selecao.push(p);
  }

  function selecaoValida(pub) {
    if (!selecao.length) return false;
    if (selecao.length === 2 && selecao[0] === selecao[1]) return true;
    var disponiveis = R.PRODUTOS.filter(function (p) { return pub.fichas[p] > 0; }).length;
    return selecao.length === Math.min(3, disponiveis);
  }

  function negocioHtml(id, info, minhaVez, reservado, podeReservar, esc) {
    var c = R.CARTAS[id];
    var st = info ? (info.pode ? '<span class="status ok">Dá para comprar!</span>' : '<span class="status">Faltam ' + info.falta + '</span>') : '';
    return '<div class="negocio" style="--b:' + COR[c.bonus] + '"><div class="topo">' + EMOJI[c.bonus] + ' ' + esc(c.nome) +
      ' <small style="color:#94a3b8">nível ' + c.nivel + (reservado ? ' · reservado' : '') + '</small><span class="pts">' + (c.pontos || '') + '</span></div>' +
      '<div class="custo">' + custoHtml(c) + '</div>' + st +
      '<div class="acoes"><button data-comprar="' + id + '"' + (minhaVez && info && info.pode ? '' : ' disabled') + '>Comprar</button>' +
      (reservado ? '' : '<button class="res" data-reservar="' + id + '"' + (minhaVez && podeReservar ? '' : ' disabled') + '>Reservar</button>') + '</div></div>';
  }

  SALA.iniciarCelular({
    jogo: 'safra',
    desenhar: function (api) {
      var pub = api.publico;
      var eu = pub.jogadores[api.idx];
      var tela = api.tela;
      var minhas = api.minha.reservadas || [];
      var compra = api.minha.compra || {};
      var esc = api.esc;

      if (pub.fase === 'fim') {
        var venci = (pub.vencedores || []).indexOf(api.idx) !== -1;
        tela.innerHTML = '<div class="vez minha">' + (venci ? (pub.vencedores.length > 1 ? 'Empate! Você está entre os vencedores 🌾' : 'Você venceu! 🌾') : 'Fim de jogo!') + '</div><p>Seus pontos: <b>' + eu.pontos + '</b> · negócios: ' + eu.cartas +
          ' · feiras: ' + (eu.feiras ? eu.feiras.length : 0) + '</p>' + api.opcoes(true);
        return;
      }

      var minhaVez = pub.vez === api.idx;
      if (!minhaVez) selecao = [];
      var html = '<div class="vez' + (minhaVez ? ' minha' : '') + '">' +
        (minhaVez ? (pub.devolvendo ? 'Você passou de 10 fichas: devolva o excesso' : 'Sua vez! Escolha UMA ação') : 'Vez de ' + esc(pub.jogadores[pub.vez].nome)) + '</div>';
      if (pub.ultimaRodada) html += '<p style="color:#fca5a5"><b>Última rodada!</b></p>';

      // minha mão primeiro: fichas (número na bolinha) e desconto dos negócios embaixo
      var total = R.PRODUTOS.concat('credito').reduce(function (a, p) { return a + (eu.fichas[p] || 0); }, 0);
      html += '<h3>Minha mão · ' + eu.pontos + ' pontos · ' + total + '/10 fichas</h3><div class="fichas">';
      R.PRODUTOS.concat('credito').forEach(function (p) {
        var n = eu.fichas[p] || 0;
        var d = p === 'credito' ? '<i>coringa</i>' : '<i>+' + (eu.bonus[p] || 0) + '</i>';
        if (minhaVez && pub.devolvendo) html += n ? '<div class="cel-f">' + fichaHtml(p, n, 'data-devolver="' + p + '"') + d + '</div>' : '';
        else html += '<div class="cel-f">' + fichaHtml(p, n) + d + '</div>';
      });
      html += '</div><p class="dica">Bolinha = fichas na mão · +N = desconto dos seus negócios</p>';
      if (minhaVez && pub.devolvendo) html += '<p class="dica">Toque nas fichas para devolver até ficar com 10.</p>';

      if (!pub.devolvendo || !minhaVez) {
        // 1. pegar produtos
        html += '<h3>1. Pegar produtos</h3><div class="fichas">';
        R.PRODUTOS.forEach(function (p) {
          var vezes = selecao.filter(function (x) { return x === p; }).length;
          html += fichaHtml(p, pub.fichas[p], 'data-prod="' + p + '"' + (minhaVez && pub.fichas[p] > 0 ? '' : ' disabled') + (vezes ? ' data-sel="1"' : ''))
            .replace('</button>', (vezes === 2 ? '<b style="background:#f59e0b">2×</b>' : '') + '</button>');
        });
        html += '</div><p class="dica">Toque em 3 produtos diferentes, ou 2 vezes no mesmo (se tiver 4 ou mais na mesa).</p>' +
          '<button class="botao" id="pegar"' + (minhaVez && selecaoValida(pub) ? '' : ' disabled') + '>Pegar ' +
          (selecao.length ? selecao.map(function (p) { return EMOJI[p]; }).join(' ') : 'produtos') + '</button>';

        // 2. comprar ou reservar
        var podeReservar = minhas.length < 3;
        if (minhas.length) {
          html += '<h3>Meus reservados (segredo)</h3>';
          minhas.forEach(function (id) { html += negocioHtml(id, compra[id], minhaVez, true, false, esc); });
        }
        html += '<h3>2. Comprar ou reservar negócio</h3>';
        [3, 2, 1].forEach(function (nv) {
          (pub.mesa[nv] || []).forEach(function (id) { html += negocioHtml(id, compra[id], minhaVez, false, podeReservar, esc); });
        });
        html += '<p class="dica">Reservar guarda o negócio só para você e dá 1 💰 crédito (vale qualquer produto). Máximo 3 reservados.</p><div class="fichas">';
        [1, 2, 3].forEach(function (nv) {
          html += '<button class="botao sec" style="flex:1;font-size:14px" data-monte="' + nv + '"' + (minhaVez && podeReservar && pub.montes[nv] ? '' : ' disabled') + '>Reservar do monte ' + nv + '</button>';
        });
        html += '</div>';
      }

      // feiras que ainda estão na mesa
      html += '<h3>Feiras na mesa (+3 cada)</h3>';
      (pub.feiras || []).forEach(function (fid) {
        var f = R.FEIRAS[fid];
        html += '<div class="negocio"><div class="topo">' + esc(f.nome) + '<span class="pts">3</span></div><div class="custo">' +
          Object.keys(f.pede).map(function (p) { return '<span>' + EMOJI[p] + ' ' + f.pede[p] + ' negócios</span>'; }).join('') + '</div></div>';
      });

      html += api.opcoes(false);
      tela.innerHTML = html;

      tela.querySelectorAll('[data-prod]').forEach(function (b) {
        b.onclick = function () {
          tocarProduto(b.getAttribute('data-prod'), pub);
          api.redesenhar();
        };
      });
      var pegar = document.getElementById('pegar');
      if (pegar) {
        pegar.onclick = function () {
          var lista = selecao.slice();
          selecao = [];
          api.travar();
          api.enviar({ tipo: 'pegar', produtos: lista });
        };
      }
      tela.querySelectorAll('[data-devolver]').forEach(function (b) {
        b.onclick = function () { api.travar(); api.enviar({ tipo: 'devolver', produto: b.getAttribute('data-devolver') }); };
      });
      tela.querySelectorAll('[data-comprar]').forEach(function (b) {
        b.onclick = function () { api.travar(); api.enviar({ tipo: 'comprar', carta: Number(b.getAttribute('data-comprar')) }); };
      });
      tela.querySelectorAll('[data-reservar]').forEach(function (b) {
        b.onclick = function () { api.travar(); api.enviar({ tipo: 'reservar', carta: Number(b.getAttribute('data-reservar')) }); };
      });
      tela.querySelectorAll('[data-monte]').forEach(function (b) {
        b.onclick = function () { api.travar(); api.enviar({ tipo: 'reservar', nivel: Number(b.getAttribute('data-monte')) }); };
      });
    },
  });
})();
