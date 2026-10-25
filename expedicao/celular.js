// Celular da Expedição: girar e colocar a peça no seu tabuleiro, ou descartar e andar com os tropeiros.
(function () {
  var R = window.REGRAS_EXPEDICAO;
  var D = window.DESENHO_EXP;
  // jogada sendo montada no celular (só vai para a TV quando confirmar)
  var local = { rodada: -1, modo: 'colocar', giro: 0, fantasma: null, passos: [], exp: null, sel: null };

  function zerar(rodada, jog) {
    local = { rodada: rodada, modo: 'colocar', giro: 0, fantasma: null, passos: [], exp: jog.exp.slice(), sel: null };
  }

  function pintar(canvas, tamCss, fn, altCss) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    altCss = altCss || tamCss;
    canvas.width = tamCss * dpr;
    canvas.height = altCss * dpr;
    canvas.style.height = altCss + 'px';
    var ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fn(ctx);
  }

  SALA.iniciarCelular({
    jogo: 'expedicao',
    desenhar: function (api) {
      var pub = api.publico;
      var eu = pub.jogadores[api.idx];
      var tela = api.tela;
      var esc = api.esc;
      if (!pub.templos) return;

      if (pub.rodada !== local.rodada || eu.feito || !local.exp) zerar(pub.rodada, eu);
      var fim = pub.fase === 'fim';
      var peca = R.PECAS[pub.peca];
      var html = '';

      if (fim) {
        var venci = (pub.vencedores || []).indexOf(api.idx) !== -1;
        html += '<div class="vez minha">' + (venci ? (pub.vencedores.length > 1 ? 'Empate! Você está entre os vencedores 🏆' : 'Você venceu! 🏆') : 'Fim da expedição!') + '</div>';
      } else if (eu.feito) {
        var faltam = pub.jogadores.filter(function (j) { return !j.feito; }).map(function (j) { return esc(j.nome); });
        html += '<div class="vez">Pronto! Esperando: ' + faltam.join(', ') + '</div>';
      } else {
        html += '<div class="vez minha">Peça ' + (pub.rodada + 1) + ' de 36: coloque OU descarte</div>';
        html += '<div class="rodada"><canvas id="peca"></canvas><div class="bts">';
        if (local.modo === 'colocar') {
          html += '<button class="botao sec" id="girar">⟳ Girar peça</button>' +
            '<button class="botao sec" id="descartar">Descartar e andar ' + peca.saidas.length + ' passos</button>';
        } else {
          html += '<b>Passos: ' + local.passos.length + ' de ' + peca.saidas.length + '</b>' +
            '<button class="botao sec" id="cancelar">Voltar (colocar a peça)</button>';
        }
        html += '</div></div>';
        if (local.modo === 'colocar') {
          html += local.fantasma === null
            ? '<p class="dica">Gire se precisar e toque numa casa vazia do seu tabuleiro.</p>'
            : '<button class="botao" id="colocar">Colocar aqui</button>';
        } else {
          html += '<p class="dica">Toque num tropeiro e depois na casa amarela para andar. Pode usar os passos em tropeiros diferentes.</p>' +
            '<div class="linha-bts"><button class="botao sec" id="desfazer"' + (local.passos.length ? '' : ' disabled') + '>Desfazer</button>' +
            '<button class="botao" id="confirmar">Confirmar' + (local.passos.length ? '' : ' (sem andar)') + '</button></div>';
        }
      }

      html += '<canvas id="tab"></canvas>';
      html += '<div class="placar"><span>' + eu.pontos + ' pontos</span><span>' + eu.chegaram + ' de ' + pub.templos.length + ' tropeiros chegaram</span></div>';
      html += '<p class="dica">Leve cada tropeiro à casinha da mesma cor. Quem chega primeiro ganha mais. Pinhão vale 2 e erva-mate 1.</p>';
      html += api.opcoes(fim);
      tela.innerHTML = html;

      // peça da rodada
      var cPeca = document.getElementById('peca');
      if (cPeca) pintar(cPeca, 96, function (ctx) { D.peca(ctx, 0, 0, 96, pub.peca * 4 + local.giro); });

      // tabuleiro
      var cTab = document.getElementById('tab');
      var tam = cTab.clientWidth || 340;
      var o = { x: 0, y: 0, t: tam, jog: eu, pub: pub, exp: local.exp, sel: local.sel, destaque: [] };
      if (!fim && !eu.feito) {
        if (local.modo === 'colocar' && local.fantasma !== null) o.fantasma = { cel: local.fantasma, v: pub.peca * 4 + local.giro };
        if (local.modo === 'andar' && local.sel !== null && local.passos.length < peca.saidas.length) {
          o.destaque = R.destinos(pub, eu.tab, local.exp, local.sel);
        }
      }
      pintar(cTab, tam, function (ctx) { D.tabuleiro(ctx, o); }, D.altura(tam));

      if (fim || eu.feito) return;

      cTab.onclick = function (ev) {
        var r = cTab.getBoundingClientRect();
        var hit = D.tocar(o, ev.clientX - r.left, ev.clientY - r.top);
        if (!hit) return;
        if (local.modo === 'colocar') {
          if (hit.tipo === 'casa' && eu.tab[hit.cel] < 0) {
            local.fantasma = hit.cel;
            api.redesenhar();
          }
          return;
        }
        // andar: tocar no destino iluminado dá o passo; tocar num tropeiro seleciona
        var alvo = hit.tipo === 'casa' ? hit.cel : hit.tipo === 'destino' && hit.e === local.sel ? R.NO_TEMPLO : null;
        if (alvo !== null && o.destaque.indexOf(alvo) !== -1) {
          local.passos.push({ e: local.sel, para: alvo });
          local.exp[local.sel] = alvo;
          if (alvo === R.NO_TEMPLO) local.sel = null;
          api.redesenhar();
          return;
        }
        var e = hit.tipo === 'casa' ? local.exp.indexOf(hit.cel) : hit.tipo === 'partida' && local.exp[hit.e] === R.NA_PARTIDA ? hit.e : -1;
        if (e !== -1) {
          local.sel = e;
          if (!R.destinos(pub, eu.tab, local.exp, e).length) api.erro('Esse tropeiro não tem caminho para andar ainda.');
          api.redesenhar();
        }
      };

      function bt(id, fn) {
        var b = document.getElementById(id);
        if (b) b.onclick = fn;
      }
      bt('girar', function () {
        local.giro = (local.giro + 1) % 4;
        api.redesenhar();
      });
      bt('descartar', function () {
        local.modo = 'andar';
        local.fantasma = null;
        // já seleciona o primeiro tropeiro que pode andar
        for (var e = 0; e < local.exp.length; e++) {
          if (R.destinos(pub, eu.tab, local.exp, e).length) {
            local.sel = e;
            break;
          }
        }
        api.redesenhar();
      });
      bt('cancelar', function () { zerar(pub.rodada, eu); api.redesenhar(); });
      bt('desfazer', function () {
        local.passos.pop();
        local.exp = eu.exp.slice();
        local.passos.forEach(function (p) { local.exp[p.e] = p.para; });
        api.redesenhar();
      });
      bt('colocar', function () {
        api.travar();
        api.enviar({ tipo: 'colocar', celula: local.fantasma, giro: local.giro });
      });
      bt('confirmar', function () {
        api.travar();
        api.enviar({ tipo: 'descartar', passos: local.passos });
      });
    },
  });
})();
