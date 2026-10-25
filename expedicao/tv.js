// Mesa da Expedição na TV: a peça da rodada, os destinos e o tabuleiro de cada jogador.
(function () {
  var R = window.REGRAS_EXPEDICAO;
  var D = window.DESENHO_EXP;
  var canvas = document.getElementById('mapa');
  var ctx = canvas.getContext('2d');
  var publico = null;
  var W = 1600;
  var H = 900;
  var view = { s: 1, ox: 0, oy: 0 };
  var trocaPeca = 0; // quando a peça mudou (animação)
  var ultimaRodada = -1;

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

  function texto(t, x, y, tam, cor, alinhar, peso) {
    ctx.fillStyle = cor;
    ctx.font = (peso || 'bold') + ' ' + tam + 'px sans-serif';
    ctx.textAlign = alinhar || 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }

  function painelEsquerdo(agora) {
    D.caixa(ctx, 20, 20, 400, 860, 18);
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.fill();
    texto('Expedição Sudoeste', 220, 60, 32, '#fde68a', 'center');
    var fim = publico.fase === 'fim';
    texto(fim ? 'Fim da expedição!' : 'Peça ' + (publico.rodada + 1) + ' de 36', 220, 105, 26, '#e2e8f0', 'center');
    if (!fim && publico.peca !== null && publico.peca !== undefined) {
      // a peça entra com um pulinho quando muda
      var k = Math.min(1, (agora - trocaPeca) / 400);
      var t = 200 * (0.6 + 0.4 * k);
      D.peca(ctx, 220 - t / 2, 240 - t / 2, t, publico.peca * 4);
      var p = R.PECAS[publico.peca];
      texto('Descartar = andar ' + p.saidas.length + ' passos', 220, 365, 22, '#fde047', 'center');
    }
    texto('Destinos (pontos do próximo a chegar)', 220, 420, 18, '#94a3b8', 'center', 'normal');
    for (var e = 0; e < publico.templos.length; e++) {
      var y = 465 + e * 70;
      var vals = (publico.valores && publico.valores[e]) || [];
      D.destino(ctx, 40, y - 26, 52, e, vals[0]);
      texto(R.TROPEIROS[e].destino, 105, y - 10, 22, R.TROPEIROS[e].cor);
      texto('tropeiro ' + R.TROPEIROS[e].nome.toLowerCase() + ' · depois: ' + (vals.slice(1).join(', ') || '1'), 105, y + 16, 16, '#cbd5e1', 'left', 'normal');
    }
    var yl = 465 + publico.templos.length * 70 + 10;
    D.pinhao(ctx, 50, yl, 30);
    texto('Pinhão = 2', 75, yl, 20, '#e2e8f0', 'left', 'normal');
    D.erva(ctx, 230, yl, 30);
    texto('Erva-mate = 1', 255, yl, 20, '#e2e8f0', 'left', 'normal');
    var log = publico.log || [];
    for (var i = 0; i < Math.min(3, log.length); i++) {
      texto(log[log.length - 1 - i], 220, 800 + i * 26, i ? 16 : 19, i ? '#94a3b8' : '#f8fafc', 'center', i ? 'normal' : 'bold');
    }
  }

  function tabuleiros() {
    var js = publico.jogadores;
    var n = js.length;
    var cols = n <= 3 ? n : 3;
    var linhas = Math.ceil(n / cols);
    var areaX = 440;
    var areaW = W - areaX - 20;
    var celW = areaW / cols;
    var celH = (H - 40) / linhas;
    // t = largura do tabuleiro; a altura sai de D.altura (o tabuleiro é mais largo que alto)
    var t = Math.min(celW - 20, (celH - 70) * celW / D.altura(celW));
    js.forEach(function (j, i) {
      var lin = Math.floor(i / cols);
      var col = i % cols;
      var naLinha = Math.min(cols, n - lin * cols);
      var sobra = (cols - naLinha) * celW / 2;
      var cx = areaX + sobra + col * celW + celW / 2;
      var y = 20 + lin * celH + (celH - D.altura(t) - 60) / 2;
      // cabeçalho: nome, pontos e se já jogou
      D.caixa(ctx, cx - t / 2, y, t, 50, 12);
      ctx.fillStyle = j.cor;
      ctx.fill();
      texto(j.nome, cx - t / 2 + 14, y + 25, Math.min(26, t / 12), '#fff');
      texto(j.pontos + ' pts', cx + t / 2 - 14, y + 25, Math.min(26, t / 12), '#fff', 'right');
      if (publico.fase === 'jogo') {
        texto(j.feito ? '✓ pronto' : 'pensando…', cx, y + 25, Math.min(20, t / 16), j.feito ? '#fef08a' : 'rgba(255,255,255,0.75)', 'center', 'normal');
      }
      D.tabuleiro(ctx, { x: cx - t / 2, y: y + 58, t: t, jog: j, pub: publico });
    });
  }

  function quadro(agora) {
    requestAnimationFrame(quadro);
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var g = ctx.createRadialGradient(vw / 2, vh / 2, 0, vw / 2, vh / 2, vw * 0.7);
    g.addColorStop(0, '#2f4f1d');
    g.addColorStop(1, '#14220c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    if (!publico || publico.fase === 'sala' || !publico.templos) return;
    ctx.save();
    ctx.translate(view.ox, view.oy);
    ctx.scale(view.s, view.s);
    painelEsquerdo(agora);
    tabuleiros();
    ctx.restore();
  }
  requestAnimationFrame(quadro);

  function telaFim() {
    var fim = publico && publico.fase === 'fim';
    document.getElementById('telaFim').classList.toggle('hidden', !fim);
    if (!fim) return;
    var nomes = (publico.vencedores || []).map(function (i) { return publico.jogadores[i].nome; });
    document.getElementById('fimTitulo').textContent = (nomes.length > 1 ? 'Empate: ' : 'Vencedor: ') + nomes.join(' e ') + '!';
    var t = '<table class="tabela"><tr><th></th><th>Pontos</th><th>Destinos</th><th>Pinhão / erva</th></tr>';
    publico.jogadores.forEach(function (j) {
      var itens = (j.coletados || []).length;
      t += '<tr><td><span class="bola" style="background:' + j.cor + '"></span>' + SALA.esc(j.nome) + '</td><td class="total">' + j.pontos +
        '</td><td>' + j.chegaram + ' de ' + publico.templos.length + '</td><td>' + itens + '</td></tr>';
    });
    document.getElementById('fimTexto').innerHTML = t + '</table><p class="dica">Clique para ver os tabuleiros. Nova partida: o primeiro jogador toca em "Nova partida" no celular.</p>';
  }
  document.getElementById('telaFim').addEventListener('click', function () { this.classList.add('hidden'); });

  SALA.iniciarTV({
    jogo: 'expedicao',
    regras: R,
    aoMudar: function (p) {
      if (p.rodada !== ultimaRodada) {
        ultimaRodada = p.rodada;
        trocaPeca = performance.now();
      }
      publico = p;
      telaFim();
    },
  });
})();
