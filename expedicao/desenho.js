// Desenho da Expedição usado pela TV e pelo celular: peças, tabuleiro com bordas e tropeiros.
(function () {
  var R = window.REGRAS_EXPEDICAO;
  var N = R.N;
  var MEIO = { N: [0.5, 0], S: [0.5, 1], L: [1, 0.5], O: [0, 0.5] };

  function caixa(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function pinhao(ctx, x, y, t, apagado) {
    ctx.save();
    ctx.globalAlpha = apagado ? 0.25 : 1;
    ctx.fillStyle = '#7c2d12';
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = Math.max(1, t * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y - t * 0.55);
    ctx.quadraticCurveTo(x + t * 0.5, y + t * 0.1, x, y + t * 0.5);
    ctx.quadraticCurveTo(x - t * 0.5, y + t * 0.1, x, y - t * 0.55);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function erva(ctx, x, y, t, apagado) {
    ctx.save();
    ctx.globalAlpha = apagado ? 0.25 : 1;
    ctx.translate(x, y);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#16a34a';
    ctx.strokeStyle = '#dcfce7';
    ctx.lineWidth = Math.max(1, t * 0.08);
    ctx.beginPath();
    ctx.ellipse(0, 0, t * 0.28, t * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -t * 0.45);
    ctx.lineTo(0, t * 0.45);
    ctx.stroke();
    ctx.restore();
  }

  // peça: v = peça*4+giro (como no tabuleiro); opcoes.fantasma desenha meio transparente
  function peca(ctx, x, y, t, v, coletado, fantasma) {
    ctx.save();
    if (fantasma) ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(x, y, t, t);
    // grama com pontinhos
    ctx.fillStyle = '#3f6212';
    for (var k = 0; k < 5; k++) ctx.fillRect(x + t * ((k * 0.37 + 0.11) % 1), y + t * ((k * 0.61 + 0.17) % 1), t * 0.06, t * 0.06);
    var sai = R.saidas(v);
    var cx = x + t / 2;
    var cy = y + t / 2;
    ctx.lineCap = 'butt';
    [['#92400e', 0.36], ['#e7c48a', 0.26]].forEach(function (cam) {
      ctx.strokeStyle = cam[0];
      ctx.lineWidth = t * cam[1];
      sai.split('').forEach(function (d) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(x + t * MEIO[d][0], y + t * MEIO[d][1]);
        ctx.stroke();
      });
      ctx.fillStyle = cam[0];
      ctx.beginPath();
      ctx.arc(cx, cy, t * cam[1] / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    var it = R.item(v);
    if (it === 'pinhao') pinhao(ctx, x + t * 0.22, y + t * 0.22, t * 0.3, coletado);
    if (it === 'erva') erva(ctx, x + t * 0.22, y + t * 0.22, t * 0.3, coletado);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, t - 1, t - 1);
    ctx.restore();
  }

  // posição (linha, coluna) na grade com borda: -1 e N são as bordas
  function lugarBorda(b) {
    if (b.lado === 'S') return [N, b.i];
    if (b.lado === 'O') return [b.i, -1];
    if (b.lado === 'N') return [-1, b.i];
    return [b.i, N];
  }

  function tropeiro(ctx, x, y, r, e, marcado) {
    var cor = R.TROPEIROS[e].cor;
    if (marcado) {
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = r * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.35, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(x + r * 0.1, y + r * 0.15, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cor;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(1.5, r * 0.18);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // chapéu
    ctx.fillStyle = '#111827';
    ctx.fillRect(x - r * 0.6, y - r * 0.25, r * 1.2, r * 0.18);
    ctx.fillRect(x - r * 0.32, y - r * 0.62, r * 0.64, r * 0.4);
  }

  function destino(ctx, x, y, t, e, valor) {
    var cor = R.TROPEIROS[e].cor;
    ctx.fillStyle = cor;
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = Math.max(1, t * 0.05);
    // casinha / capela
    ctx.beginPath();
    ctx.moveTo(x + t * 0.5, y + t * 0.1);
    ctx.lineTo(x + t * 0.88, y + t * 0.42);
    ctx.lineTo(x + t * 0.88, y + t * 0.9);
    ctx.lineTo(x + t * 0.12, y + t * 0.9);
    ctx.lineTo(x + t * 0.12, y + t * 0.42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (valor !== undefined) {
      ctx.fillStyle = '#111827';
      ctx.font = 'bold ' + Math.round(t * 0.38) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(valor ? String(valor) : '1', x + t * 0.5, y + t * 0.64);
    }
  }

  function partida(ctx, x, y, t, e) {
    ctx.strokeStyle = R.TROPEIROS[e].cor;
    ctx.lineWidth = Math.max(2, t * 0.08);
    ctx.setLineDash([t * 0.12, t * 0.08]);
    ctx.beginPath();
    ctx.arc(x + t / 2, y + t / 2, t * 0.38, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // tabuleiro completo de um jogador. o = { x, y, t (tamanho total), jog, pub, exp (opcional, posições locais),
  //   destaque: [casas ou 99], sel: tropeiro selecionado, fantasma: { cel, v }, marcarVazias }
  function tabuleiro(ctx, o) {
    var cel = o.t / (N + 2);
    var x0 = o.x + cel;
    var y0 = o.y + cel;
    var jog = o.jog;
    var exp = o.exp || jog.exp;
    var col = jog.coletados || [];
    var pub = o.pub;
    caixa(ctx, o.x, o.y, o.t, o.t, cel * 0.3);
    ctx.fillStyle = '#1c2a12';
    ctx.fill();
    ctx.fillStyle = '#365314';
    ctx.fillRect(x0, y0, cel * N, cel * N);
    for (var c = 0; c < N * N; c++) {
      var px = x0 + (c % N) * cel;
      var py = y0 + Math.floor(c / N) * cel;
      if (jog.tab[c] >= 0) peca(ctx, px, py, cel, jog.tab[c], col.indexOf(c) !== -1);
      else {
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cel - 1, cel - 1);
      }
      if (o.fantasma && o.fantasma.cel === c) peca(ctx, px, py, cel, o.fantasma.v, false, true);
    }
    // partidas e destinos na borda
    for (var e = 0; e < pub.inicios.length; e++) {
      var li = lugarBorda(pub.inicios[e]);
      partida(ctx, x0 + li[1] * cel, y0 + li[0] * cel, cel, e);
      var lt = lugarBorda(pub.templos[e]);
      var vals = (pub.valores && pub.valores[e]) || [];
      destino(ctx, x0 + lt[1] * cel, y0 + lt[0] * cel, cel, e, vals[0]);
    }
    // destaques (para onde dá para andar / onde colocar)
    (o.destaque || []).forEach(function (d) {
      var lx;
      var ly;
      if (d === R.NO_TEMPLO) {
        var lt2 = lugarBorda(pub.templos[o.sel]);
        lx = x0 + lt2[1] * cel;
        ly = y0 + lt2[0] * cel;
      } else {
        lx = x0 + (d % N) * cel;
        ly = y0 + Math.floor(d / N) * cel;
      }
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = Math.max(3, cel * 0.1);
      ctx.strokeRect(lx + 2, ly + 2, cel - 4, cel - 4);
    });
    // tropeiros
    for (var e2 = 0; e2 < exp.length; e2++) {
      var p = exp[e2];
      var tx;
      var ty;
      if (p === R.NA_PARTIDA) {
        var l1 = lugarBorda(pub.inicios[e2]);
        tx = x0 + (l1[1] + 0.5) * cel;
        ty = y0 + (l1[0] + 0.5) * cel;
      } else if (p === R.NO_TEMPLO) {
        var l2 = lugarBorda(pub.templos[e2]);
        tx = x0 + (l2[1] + 0.8) * cel;
        ty = y0 + (l2[0] + 0.25) * cel;
      } else {
        tx = x0 + (p % N + 0.62) * cel;
        ty = y0 + (Math.floor(p / N) + 0.62) * cel;
      }
      tropeiro(ctx, tx, ty, cel * (p === R.NO_TEMPLO ? 0.17 : 0.22), e2, o.sel === e2);
    }
  }

  // de um toque (coordenadas dentro do tabuleiro) para { tipo: 'casa', cel } ou { tipo: 'partida'|'destino', e }
  function tocar(o, px, py) {
    var cel = o.t / (N + 2);
    var gc = Math.floor((px - o.x) / cel) - 1;
    var gr = Math.floor((py - o.y) / cel) - 1;
    if (gr >= 0 && gr < N && gc >= 0 && gc < N) return { tipo: 'casa', cel: gr * N + gc };
    for (var e = 0; e < o.pub.inicios.length; e++) {
      var li = lugarBorda(o.pub.inicios[e]);
      if (li[0] === gr && li[1] === gc) return { tipo: 'partida', e: e };
      var lt = lugarBorda(o.pub.templos[e]);
      if (lt[0] === gr && lt[1] === gc) return { tipo: 'destino', e: e };
    }
    return null;
  }

  window.DESENHO_EXP = { peca: peca, tabuleiro: tabuleiro, tocar: tocar, tropeiro: tropeiro, destino: destino, pinhao: pinhao, erva: erva, caixa: caixa };
})();
