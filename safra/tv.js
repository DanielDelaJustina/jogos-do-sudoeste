// Mesa do Safra do Sudoeste na TV: feiras, negócios à venda, pilhas de produtos e placar.
(function () {
  var R = window.REGRAS_SAFRA;
  var COR = { leite: '#f1f5f9', milho: '#facc15', soja: '#84cc16', suino: '#f9a8d4', erva: '#166534', credito: '#d4a017' };
  var FUNDO_CARTA = { leite: '#e0f2fe', milho: '#fef9c3', soja: '#ecfccb', suino: '#fce7f3', erva: '#dcfce7' };
  var canvas = document.getElementById('mapa');
  var ctx = canvas.getContext('2d');
  var publico = null;
  var W = 1600;
  var H = 900;
  var view = { s: 1, ox: 0, oy: 0 };
  var destaque = null;

  function redimensionar() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.s = Math.min(window.innerWidth / W, window.innerHeight / H);
    view.ox = (window.innerWidth - W * view.s) / 2;
    view.oy = (window.innerHeight - H * view.s) / 2;
  }
  window.addEventListener('resize', redimensionar);
  redimensionar();

  function caixa(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ícone de cada produto desenhado dentro de uma ficha redonda
  function ficha(x, y, r, p, numero) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(x + r * 0.08, y + r * 0.12, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COR[p];
    ctx.strokeStyle = p === 'leite' ? '#94a3b8' : 'rgba(0,0,0,0.45)';
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    icone(x, y, r * 0.62, p);
    if (numero !== undefined) {
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(x + r * 0.75, y + r * 0.75, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(r * 0.55) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(numero), x + r * 0.75, y + r * 0.78);
    }
  }

  function icone(x, y, s, p) {
    ctx.save();
    ctx.translate(x, y);
    if (p === 'milho') {
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.ellipse ? ctx.ellipse(-s * 0.3, s * 0.2, s * 0.25, s * 0.7, -0.4, 0, Math.PI * 2) : ctx.arc(-s * 0.3, 0, s * 0.3, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#ca8a04';
      ctx.beginPath();
      ctx.ellipse ? ctx.ellipse(s * 0.05, -s * 0.05, s * 0.32, s * 0.8, 0.2, 0, Math.PI * 2) : ctx.arc(0, 0, s * 0.4, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      for (var i = -3; i <= 3; i++) ctx.fillRect(-s * 0.12 + Math.abs(i) * 0.01, i * s * 0.2 - s * 0.05, s * 0.32, s * 0.1);
    } else if (p === 'soja') {
      ctx.fillStyle = '#3f6212';
      ctx.beginPath();
      ctx.ellipse ? ctx.ellipse(0, 0, s * 0.95, s * 0.42, -0.5, 0, Math.PI * 2) : ctx.arc(0, 0, s * 0.5, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#d9f99d';
      for (var k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.arc(k * s * 0.42, -k * s * 0.22, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (p === 'leite') {
      ctx.fillStyle = '#2563eb';
      ctx.fillRect(-s * 0.35, -s * 0.3, s * 0.7, s * 1.05);
      ctx.fillRect(-s * 0.2, -s * 0.75, s * 0.4, s * 0.5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-s * 0.25, -s * 0.05, s * 0.5, s * 0.4);
    } else if (p === 'suino') {
      ctx.fillStyle = '#ec4899';
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.75, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f9a8d4';
      ctx.beginPath();
      ctx.ellipse ? ctx.ellipse(0, s * 0.25, s * 0.38, s * 0.26, 0, 0, Math.PI * 2) : ctx.arc(0, s * 0.25, s * 0.3, 0, 7);
      ctx.fill();
      ctx.fillStyle = '#831843';
      ctx.beginPath();
      ctx.arc(-s * 0.13, s * 0.25, s * 0.08, 0, Math.PI * 2);
      ctx.arc(s * 0.13, s * 0.25, s * 0.08, 0, Math.PI * 2);
      ctx.arc(-s * 0.3, -s * 0.2, s * 0.08, 0, Math.PI * 2);
      ctx.arc(s * 0.3, -s * 0.2, s * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (p === 'erva') {
      ctx.fillStyle = '#86efac';
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.9, -s * 0.2, 0, s);
      ctx.quadraticCurveTo(-s * 0.9, -s * 0.2, 0, -s);
      ctx.fill();
      ctx.strokeStyle = '#14532d';
      ctx.lineWidth = s * 0.1;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(0, s * 0.9);
      ctx.stroke();
    } else if (p === 'credito') {
      ctx.fillStyle = '#78350f';
      ctx.font = 'bold ' + Math.round(s * 1.4) + 'px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', 0, s * 0.08);
    }
    ctx.restore();
  }

  function carta(x, y, w, h, id, brilho) {
    var c = R.CARTAS[id];
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    caixa(x + 4, y + 6, w, h, 12);
    ctx.fill();
    ctx.fillStyle = FUNDO_CARTA[c.bonus];
    caixa(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = brilho ? '#f59e0b' : ['', '#65a30d', '#ca8a04', '#9333ea'][c.nivel];
    ctx.lineWidth = brilho ? 6 : 3;
    ctx.stroke();
    // faixa de cima: pontos e o produto que o negócio dá de desconto
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(x + 3, y + 3, w - 6, h * 0.24);
    if (c.pontos) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold ' + Math.round(h * 0.2) + 'px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(c.pontos), x + 12, y + h * 0.14);
    }
    ficha(x + w - h * 0.14, y + h * 0.14, h * 0.1, c.bonus);
    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold ' + Math.round(h * 0.085) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(c.nome, x + w / 2, y + h * 0.4);
    // custos embaixo
    var custos = Object.keys(c.custo);
    custos.forEach(function (p, i) {
      ficha(x + 22 + i * (h * 0.2), y + h * 0.82, h * 0.085, p, c.custo[p]);
    });
  }

  function verso(x, y, w, h, nivel, qtd) {
    ctx.fillStyle = ['', '#365314', '#713f12', '#4c1d95'][nivel];
    caixa(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold ' + Math.round(h * 0.16) + 'px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(['', 'I', 'II', 'III'][nivel], x + w / 2, y + h * 0.38);
    ctx.font = Math.round(h * 0.1) + 'px sans-serif';
    ctx.fillText(qtd + ' no monte', x + w / 2, y + h * 0.66);
  }

  function feira(x, y, w, h, id, dono) {
    var f = R.FEIRAS[id];
    ctx.fillStyle = dono ? dono : '#7c2d12';
    caixa(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold ' + Math.round(h * 0.2) + 'px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('3', x + 10, y + h * 0.22);
    ctx.font = 'bold ' + Math.round(h * 0.12) + 'px sans-serif';
    ctx.fillText(f.nome.replace('Feira de ', ''), x + 34, y + h * 0.22);
    var ps = Object.keys(f.pede);
    ps.forEach(function (p, i) {
      ficha(x + 22 + i * h * 0.3, y + h * 0.66, h * 0.13, p, f.pede[p]);
    });
  }

  function quadro(agora) {
    requestAnimationFrame(quadro);
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var g = ctx.createRadialGradient(vw / 2, vh / 2, 0, vw / 2, vh / 2, vw * 0.7);
    g.addColorStop(0, '#7c4a1e');
    g.addColorStop(1, '#3b2410');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    if (!publico || publico.fase === 'sala' || !publico.mesa) return;
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.s, view.s);

    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('Safra do Sudoeste', 30, 38);
    var vezJ = publico.jogadores[publico.vez];
    if (vezJ && publico.fase === 'jogo') {
      ctx.textAlign = 'right';
      ctx.fillStyle = vezJ.cor;
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText('Vez de ' + vezJ.nome + (publico.devolvendo ? ' (devolvendo fichas)' : ''), 1570, 38);
    }
    if (publico.ultimaRodada && publico.fase === 'jogo') {
      ctx.textAlign = 'center';
      ctx.fillStyle = Math.floor(agora / 500) % 2 ? '#fca5a5' : '#fde047';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('ÚLTIMA RODADA!', 800, 38);
    }

    // feiras (esquerda)
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Feiras (+3)', 30, 92);
    (publico.feiras || []).forEach(function (id, i) {
      feira(24, 112 + i * 112, 210, 100, id);
    });

    // negócios: nível III em cima
    var cw = 196;
    var chh = 182;
    [3, 2, 1].forEach(function (nv, linha) {
      var y = 76 + linha * (chh + 16);
      verso(270, y, 150, chh, nv, publico.montes[nv]);
      (publico.mesa[nv] || []).forEach(function (id, k) {
        var brilho = destaque && destaque.carta === id && agora - destaque.t < 3000;
        carta(440 + k * (cw + 16), y, cw, chh, id, brilho);
      });
    });

    // pilhas de produtos (direita)
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Produtos', 1340, 92);
    R.PRODUTOS.concat('credito').forEach(function (p, i) {
      ficha(1380, 142 + i * 82, 32, p);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('× ' + (publico.fichas[p] || 0), 1424, 146 + i * 82);
      ctx.fillStyle = '#e7e5e4';
      ctx.font = '18px sans-serif';
      ctx.fillText(R.NOMES[p], 1500, 146 + i * 82);
    });

    // jogadores (embaixo)
    var n = publico.jogadores.length;
    var pw = (1560 - (n - 1) * 14) / n;
    publico.jogadores.forEach(function (j, i) {
      var x = 20 + i * (pw + 14);
      var y = 690;
      var vez = publico.fase === 'jogo' && publico.vez === i;
      ctx.fillStyle = vez ? 'rgba(250,204,21,0.22)' : 'rgba(0,0,0,0.35)';
      caixa(x, y, pw, 196, 14);
      ctx.fill();
      ctx.strokeStyle = vez ? '#facc15' : j.cor;
      ctx.lineWidth = vez ? 4 : 2;
      ctx.stroke();
      ctx.fillStyle = j.cor;
      ctx.fillRect(x + 12, y + 14, 12, 40);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(j.nome, x + 34, y + 34);
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'right';
      ctx.font = 'bold 44px Georgia, serif';
      ctx.fillText(String(j.pontos), x + pw - 16, y + 38);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#d6d3d1';
      ctx.font = '17px sans-serif';
      ctx.fillText('Negócios (desconto)', x + 14, y + 80);
      ctx.fillText('Fichas na mão', x + 14, y + 140);
      R.PRODUTOS.forEach(function (p, k) {
        var fx = x + 30 + k * Math.min(56, (pw - 40) / 6);
        ficha(fx, y + 108, 17, p, j.bonus[p]);
        ficha(fx, y + 168, 17, p, j.fichas[p]);
      });
      ficha(x + 30 + 5 * Math.min(56, (pw - 40) / 6), y + 168, 17, 'credito', j.fichas.credito);
      ctx.fillStyle = '#d6d3d1';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('reservados ' + j.reservadas + ' · feiras ' + (j.feiras ? j.feiras.length : 0), x + pw - 14, y + 80);
    });

    // o que aconteceu
    var log = (publico.log || []).slice(-1)[0];
    if (log) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(270, 652, 1050, 32);
      ctx.fillStyle = '#fff';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(log, 795, 668);
    }
    ctx.restore();
  }
  requestAnimationFrame(quadro);

  function telaFim() {
    var fim = publico && publico.fase === 'fim';
    document.getElementById('telaFim').classList.toggle('hidden', !fim);
    if (!fim) return;
    var nomes = publico.vencedores.map(function (i) { return publico.jogadores[i].nome; });
    document.getElementById('fimTitulo').textContent = (nomes.length > 1 ? 'Empate: ' : 'Vencedor: ') + nomes.join(' e ') + '!';
    var t = '<table class="tabela"><tr><th></th><th>Pontos</th><th>Negócios</th><th>Feiras</th></tr>';
    publico.jogadores.forEach(function (j) {
      t += '<tr><td><span class="bola" style="background:' + j.cor + '"></span>' + SALA.esc(j.nome) + '</td><td class="total">' + j.pontos +
        '</td><td>' + j.cartas + '</td><td>' + (j.feiras ? j.feiras.length : 0) + '</td></tr>';
    });
    document.getElementById('fimTexto').innerHTML = t + '</table><p class="dica">Clique para ver a mesa. Nova partida: o primeiro jogador toca em "Nova partida" no celular.</p>';
  }
  document.getElementById('telaFim').addEventListener('click', function () { this.classList.add('hidden'); });

  SALA.iniciarTV({
    jogo: 'safra',
    regras: R,
    aoMudar: function (p) {
      if (p.ultimaCompra && (!destaque || destaque.n !== p.ultimaCompra.n)) destaque = { carta: p.ultimaCompra.carta, n: p.ultimaCompra.n, t: performance.now() };
      publico = p;
      telaFim();
    },
  });
})();
