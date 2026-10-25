// Tela da TV: é o tabuleiro E o juiz. Cria a sala, recebe as ações dos celulares pelo Firebase,
// aplica as regras e publica o que cada um pode ver. Também desenha o mapa.
(function () {
  var MAPA = window.MAPA;
  var ROTULO_CIMA = ['Francisco Beltrão', 'Capanema', "Itapejara d'Oeste"];
  var ROTULO_ESQ = ['Marmeleiro'];
  var CORES_CARTA = {
    vermelho: '#dc2626', azul: '#2563eb', verde: '#16a34a', amarelo: '#facc15', laranja: '#f97316',
    roxo: '#9333ea', preto: '#1f2937', branco: '#f8fafc', cinza: '#9ca3af', loco: '#0f172a',
  };
  var canvas = document.getElementById('mapa');
  var ctx = canvas.getContext('2d');
  var estado = null;
  var publico = null;
  var sala = null;
  var processadas = {};
  var fila = Promise.resolve();
  var destaque = null; // rota recém-ocupada piscando

  // ---------- sala ----------

  function novoCodigo() {
    var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var c = '';
    for (var i = 0; i < 5; i++) c += letras.charAt(Math.floor(Math.random() * letras.length));
    return c;
  }

  function linkCelular() {
    return location.href.replace(/tv\.html.*$/, '') + 'celular.html?sala=' + sala;
  }

  function iniciar() {
    var params = new URLSearchParams(location.search);
    var salva = null;
    try { salva = localStorage.getItem('trilhosSala'); } catch (e) {}
    sala = params.get('sala') || (params.get('nova') ? null : salva) || novoCodigo();
    try { localStorage.setItem('trilhosSala', sala); } catch (e) {}
    if (params.get('sala') !== sala) history.replaceState(null, '', 'tv.html?sala=' + sala);

    FB.get('salas/' + sala + '/estado').then(function (salvo) {
      // a TV pode recarregar no meio da partida: continua de onde parou
      estado = salvo && salvo.sala === sala ? normalizar(salvo) : REGRAS.novoEstado(sala);
      publicar();
      FB.listen('salas/' + sala + '/acoes', function (acoes) {
        if (!acoes) return;
        Object.keys(acoes).sort().forEach(function (id) {
          if (processadas[id]) return;
          processadas[id] = true;
          fila = fila.then(function () { return processar(id, acoes[id]); });
        });
      });
    });
    montarSala();
  }

  // o Firebase não guarda listas/objetos vazios: recoloca o que sumiu
  function normalizar(s) {
    s.jogadores = s.jogadores || [];
    s.log = s.log || [];
    s.jogadores.forEach(function (j) {
      j.mao = j.mao || {};
      j.meusBilhetes = j.meusBilhetes || [];
      j.pendentes = j.pendentes || [];
    });
    if (s.ultimaVolta === undefined) s.ultimaVolta = null;
    if (s.fase !== 'sala') {
      s.compradas = s.compradas || 0;
      s.baralho = s.baralho || [];
      s.descarte = s.descarte || [];
      s.abertas = s.abertas || [];
      s.bilhetes = s.bilhetes || [];
      s.donas = s.donas || {};
    }
    return s;
  }

  function processar(id, acao) {
    var erro = REGRAS.aplicar(estado, MAPA, acao.key, acao);
    estado.versao = (estado.versao || 0) + 1;
    var erros = {};
    if (erro && acao.key) erros[acao.key] = { msg: erro, t: Date.now() };
    return publicar(erros).then(function () { return FB.del('salas/' + sala + '/acoes/' + id); });
  }

  // grava tudo de uma vez: estado completo (para recarregar), visão pública e a mão de cada um.
  // O erro de uma jogada vai junto na "mão" do jogador (assim o celular só precisa escutar 2 caminhos).
  function publicar(erros) {
    erros = erros || {};
    publico = REGRAS.visaoPublica(estado, MAPA);
    var up = { estado: estado, publico: publico };
    estado.jogadores.forEach(function (j, i) {
      if (estado.fase === 'sala') return;
      var mao = REGRAS.visaoPrivada(estado, MAPA, i);
      if (erros[j.key]) {
        mao.erro = erros[j.key];
        delete erros[j.key];
      }
      up['maos/' + j.key] = mao;
    });
    if (estado.fase === 'sala') {
      // na sala ninguém tem mão: apaga as da partida anterior (guardando só avisos de erro)
      var vazias = {};
      for (var e in erros) vazias[e] = { erro: erros[e] };
      up.maos = Object.keys(vazias).length ? vazias : null;
    } else {
      for (var k in erros) up['maos/' + k + '/erro'] = erros[k];
    }
    if (publico.ultimaRota && (!destaque || destaque.n !== publico.ultimaRota.n)) {
      destaque = { id: publico.ultimaRota.id, n: publico.ultimaRota.n, t: performance.now() };
      apito();
    }
    atualizarTelas();
    return FB.patch('salas/' + sala, up).catch(function (e) { console.error(e); });
  }

  // ---------- telas por cima do mapa ----------

  // no fim, o placar some com um clique (para ver o mapa final) e volta pela faixa
  var placarEscondido = false;
  document.getElementById('telaAviso').addEventListener('click', function () {
    if (!publico || publico.fase !== 'fim') return;
    placarEscondido = true;
    atualizarTelas();
  });
  document.getElementById('faixa').addEventListener('click', function () {
    if (!publico || publico.fase !== 'fim') return;
    placarEscondido = false;
    atualizarTelas();
  });

  var qrFeito = false;
  function montarSala() {
    document.getElementById('codigo').textContent = sala;
    document.getElementById('link').textContent = linkCelular();
    if (!qrFeito && window.QRCode) {
      new QRCode(document.getElementById('qr'), { text: linkCelular(), width: 340, height: 340 });
      qrFeito = true;
    }
  }

  function atualizarTelas() {
    if (!publico) return;
    var f = publico.fase;
    document.getElementById('telaSala').classList.toggle('hidden', f !== 'sala');
    if (f === 'sala') {
      var html = '';
      publico.jogadores.forEach(function (j, i) {
        html += '<div><span class="bola" style="background:' + j.cor + '"></span>' + esc(j.nome) + (i === 0 ? ' (começa a partida)' : '') + '</div>';
      });
      document.getElementById('listaJog').innerHTML = html;
      document.getElementById('dicaComecar').textContent = publico.jogadores.length >= 2
        ? publico.jogadores[0].nome + ': aperte COMEÇAR no celular quando todos entrarem.'
        : 'Esperando jogadores (2 a 5)...';
    }
    var aviso = document.getElementById('telaAviso');
    var faixa = document.getElementById('faixa');
    // escolha de bilhetes: só uma faixa no topo, para dar para olhar o mapa enquanto decide
    faixa.classList.toggle('hidden', f !== 'bilhetes');
    if (f === 'bilhetes') {
      var falta = publico.jogadores.filter(function (j) { return j.escolhendo; }).map(function (j) { return esc(j.nome); });
      faixa.innerHTML = '<b>Escolham os bilhetes no celular</b> (fiquem com pelo menos 2) · o celular mostra no mapinha onde ficam as cidades · faltam: ' + falta.join(', ');
    }
    if (f !== 'fim') placarEscondido = false;
    if (f === 'bilhetes') {
      aviso.classList.add('hidden');
    } else if (f === 'fim') {
      aviso.classList.toggle('hidden', placarEscondido);
      if (placarEscondido) {
        faixa.classList.remove('hidden');
        faixa.innerHTML = '<b>Fim de jogo.</b> Clique aqui para ver o placar de novo.';
      }
      var vencedores = publico.vencedores.map(function (i) { return publico.jogadores[i].nome; });
      document.getElementById('avisoTitulo').textContent = (vencedores.length > 1 ? 'Empate: ' : 'Vencedor: ') + vencedores.join(' e ') + '!';
      var t = '<table class="tabela"><tr><th></th><th>Rotas</th><th>Bilhetes</th><th>Não feitos</th><th>Maior caminho</th><th>Total</th></tr>';
      publico.jogadores.forEach(function (j, i) {
        var r = publico.resultado[i];
        t += '<tr><td><span class="bola" style="background:' + j.cor + '"></span>' + esc(j.nome) + '</td><td>' + r.rotas + '</td><td>+' + r.bilhetes +
          '</td><td>−' + r.perdidos + '</td><td>' + r.caminho + (r.bonus ? ' (+' + r.bonus + ')' : '') + '</td><td class="total">' + r.total + '</td></tr>';
      });
      document.getElementById('avisoTexto').innerHTML = t + '</table><p class="dica">Clique para ver o mapa final. Nova partida: o primeiro jogador toca em "Nova partida" no celular.</p>';
    } else {
      aviso.classList.add('hidden');
    }
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  // ---------- desenho ----------

  var fundo = null;
  var fundoChave = '';
  var view = { w: 0, h: 0, s: 1, ox: 0, oy: 0, painel: 0, base: 0 };

  function redimensionar() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    canvas.width = view.w * dpr;
    canvas.height = view.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    view.painel = view.w * 0.2;
    view.base = view.h * 0.17;
    var aw = view.w - view.painel;
    var ah = view.h - view.base;
    view.s = Math.min(aw / MAPA.largura, ah / MAPA.altura);
    view.ox = (aw - MAPA.largura * view.s) / 2;
    view.oy = (ah - MAPA.altura * view.s) / 2;
    fundoChave = '';
  }
  window.addEventListener('resize', redimensionar);
  redimensionar();

  function X(x) { return view.ox + x * view.s; }
  function Y(y) { return view.oy + y * view.s; }

  // números "aleatórios" fixos para o terreno ficar igual sempre
  function semente(n) {
    var x = Math.sin(n * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  function pintarFundo() {
    var c = document.createElement('canvas');
    var dpr = canvas.width / view.w;
    c.width = canvas.width;
    c.height = canvas.height;
    var g = c.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#0f1720';
    g.fillRect(0, 0, view.w, view.h);
    var W = MAPA.largura * view.s;
    var H = MAPA.altura * view.s;
    // terreno
    var grad = g.createLinearGradient(X(0), Y(0), X(MAPA.largura), Y(MAPA.altura));
    grad.addColorStop(0, '#5f8f3e');
    grad.addColorStop(0.5, '#7aa34d');
    grad.addColorStop(1, '#8a9b4f');
    g.fillStyle = grad;
    g.fillRect(X(0), Y(0), W, H);
    // manchas de mata e lavoura
    for (var i = 0; i < 160; i++) {
      var mx = semente(i) * MAPA.largura;
      var my = semente(i + 500) * MAPA.altura;
      var mr = 15 + semente(i + 900) * 45;
      g.fillStyle = semente(i + 1300) < 0.5 ? 'rgba(34,85,34,0.12)' : 'rgba(210,190,110,0.12)';
      g.beginPath();
      g.arc(X(mx), Y(my), mr * view.s, 0, Math.PI * 2);
      g.fill();
    }
    // rios: Iguaçu no norte, Chopim cortando a região, Santo Antônio na divisa com a Argentina
    function rio(pts, larg) {
      g.strokeStyle = '#3b82c4';
      g.lineWidth = larg * view.s;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(X(pts[0][0]), Y(pts[0][1]));
      for (var k = 1; k < pts.length - 1; k++) {
        var mxp = (pts[k][0] + pts[k + 1][0]) / 2;
        var myp = (pts[k][1] + pts[k + 1][1]) / 2;
        g.quadraticCurveTo(X(pts[k][0]), Y(pts[k][1]), X(mxp), Y(myp));
      }
      g.lineTo(X(pts[pts.length - 1][0]), Y(pts[pts.length - 1][1]));
      g.stroke();
    }
    rio([[0, 18], [300, 30], [520, 12], [760, 34], [1000, 14], [1250, 26], [1600, 10]], 16);
    rio([[1560, 900], [1380, 760], [1180, 640], [1020, 520], [900, 400], [800, 260], [700, 120], [640, 30]], 8);
    rio([[10, 900], [40, 700], [20, 520], [50, 360], [30, 200], [40, 40]], 7);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.font = 'italic ' + Math.round(16 * view.s) + 'px Georgia, serif';
    g.save();
    g.translate(X(330), Y(58));
    g.fillText('Rio Iguaçu', 0, 0);
    g.restore();
    g.save();
    g.translate(X(960), Y(470));
    g.rotate(0.75);
    g.fillText('Rio Chopim', 0, 0);
    g.restore();
    g.fillStyle = 'rgba(255,255,255,0.45)';
    g.font = 'bold ' + Math.round(20 * view.s) + 'px sans-serif';
    g.save();
    g.translate(X(70), Y(640));
    g.rotate(-Math.PI / 2);
    g.fillText('ARGENTINA', 0, 0);
    g.restore();
    g.fillText('SANTA CATARINA', X(620), Y(885));
    // moldura e título
    g.strokeStyle = '#78350f';
    g.lineWidth = 8 * view.s;
    g.strokeRect(X(0), Y(0), W, H);
    g.fillStyle = 'rgba(69,26,3,0.85)';
    g.fillRect(X(1190), Y(40), 380 * view.s, 62 * view.s);
    g.fillStyle = '#fde68a';
    g.font = 'bold ' + Math.round(30 * view.s) + 'px Georgia, serif';
    g.fillText('Trilhos do Sudoeste', X(1210), Y(82));
    // rotas vazias e cidades (não mudam)
    MAPA.rotas.forEach(function (r) { desenharRota(g, r, null); });
    MAPA.cidades.forEach(function (cd) { desenharCidade(g, cd); });
    return c;
  }

  // casas da rota (retângulos) entre as duas cidades; rota dupla fica deslocada para o lado
  function casasDaRota(r) {
    var a = MAPA.cidades[r.a];
    var b = MAPA.cidades[r.b];
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var L = Math.hypot(dx, dy);
    var ux = dx / L;
    var uy = dy / L;
    var gemea = MAPA.rotas.some(function (q) { return q.id !== r.id && ((q.a === r.a && q.b === r.b) || (q.a === r.b && q.b === r.a)); });
    var off = gemea ? (r.dupla ? 9 : -9) : 0;
    var px = -uy * off;
    var py = ux * off;
    var margem = 18;
    var gap = 4;
    var comp = (L - margem * 2 - gap * (r.n - 1)) / r.n;
    var casas = [];
    for (var i = 0; i < r.n; i++) {
      var d = margem + i * (comp + gap) + comp / 2;
      casas.push({ x: a.x + ux * d + px, y: a.y + uy * d + py, ang: Math.atan2(dy, dx), comp: comp });
    }
    return casas;
  }

  // parte: 'faixa' (só o destaque por baixo), 'vagoes' (só os vagões) ou nada (tudo)
  function desenharRota(g, r, corJogador, brilho, parte) {
    var casas = casasDaRota(r);
    if (corJogador && parte !== 'vagoes') {
      // rota ocupada: faixa larga (escura por fora, branca por dentro) por baixo dos vagões, para destacar do mapa
      var ini = casas[0];
      var fim = casas[casas.length - 1];
      var meio = ini.comp / 2;
      var x1 = X(ini.x - Math.cos(ini.ang) * meio);
      var y1 = Y(ini.y - Math.sin(ini.ang) * meio);
      var x2 = X(fim.x + Math.cos(fim.ang) * meio);
      var y2 = Y(fim.y + Math.sin(fim.ang) * meio);
      g.lineCap = 'butt'; // não avança sobre a bolinha da cidade
      g.strokeStyle = 'rgba(15,23,42,0.85)';
      g.lineWidth = 29 * view.s;
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      g.strokeStyle = brilho ? '#fde047' : '#ffffff';
      g.lineWidth = 24 * view.s;
      g.stroke();
    }
    if (parte === 'faixa') return;
    casas.forEach(function (c) {
      g.save();
      g.translate(X(c.x), Y(c.y));
      g.rotate(c.ang);
      var w = c.comp * view.s;
      if (corJogador) {
        // vagão do jogador: maior, com borda escura, janelas e rodinhas
        var h = 18 * view.s;
        g.fillStyle = corJogador;
        g.strokeStyle = '#0f172a';
        g.lineWidth = Math.max(2, 2.5 * view.s);
        arredondado(g, -w / 2, -h / 2, w, h, h * 0.25);
        g.fill();
        g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        for (var k = -1; k <= 1; k++) g.fillRect(k * w * 0.26 - w * 0.08, -h * 0.28, w * 0.16, h * 0.34);
        g.fillStyle = '#0f172a';
        g.beginPath();
        g.arc(-w * 0.3, h * 0.5, h * 0.14, 0, Math.PI * 2);
        g.arc(w * 0.3, h * 0.5, h * 0.14, 0, Math.PI * 2);
        g.fill();
      } else {
        // rota livre: um pouco mais apagada, para os trens se destacarem
        var hl = 12 * view.s;
        g.globalAlpha = 0.8;
        g.fillStyle = CORES_CARTA[r.cor];
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.lineWidth = 1.5;
        g.fillRect(-w / 2, -hl / 2, w, hl);
        g.strokeRect(-w / 2, -hl / 2, w, hl);
        g.globalAlpha = 1;
      }
      g.restore();
    });
  }

  function arredondado(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }

  function desenharCidade(g, c) {
    var r = 11 * view.s;
    g.fillStyle = '#fff7ed';
    g.strokeStyle = '#7c2d12';
    g.lineWidth = 3 * view.s;
    g.beginPath();
    g.arc(X(c.x), Y(c.y), r, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    // cidades muito perto uma da outra: o nome de uma vai para cima
    var cima = ROTULO_CIMA.indexOf(c.nome) !== -1;
    var esq = ROTULO_ESQ.indexOf(c.nome) !== -1;
    g.font = 'bold ' + Math.round(15 * view.s) + 'px sans-serif';
    g.textAlign = esq ? 'right' : 'center';
    g.textBaseline = esq ? 'middle' : cima ? 'bottom' : 'top';
    var tx = esq ? X(c.x) - r - 4 : X(c.x);
    var ty = esq ? Y(c.y) : cima ? Y(c.y) - r - 2 : Y(c.y) + r + 2;
    g.lineWidth = 4 * view.s;
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.strokeText(c.nome, tx, ty);
    g.fillStyle = '#1c1917';
    g.fillText(c.nome, tx, ty);
  }

  function carta(x, y, w, h, cor) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 3, y + 4, w, h);
    ctx.fillStyle = cor === 'loco' ? '#111827' : CORES_CARTA[cor];
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = cor === 'loco' ? '#facc15' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
    // trenzinho desenhado na carta
    ctx.fillStyle = cor === 'branco' || cor === 'amarelo' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.8)';
    ctx.fillRect(x + w * 0.2, y + h * 0.45, w * 0.6, h * 0.2);
    ctx.fillRect(x + w * 0.55, y + h * 0.32, w * 0.2, h * 0.13);
    ctx.beginPath();
    ctx.arc(x + w * 0.32, y + h * 0.7, w * 0.07, 0, Math.PI * 2);
    ctx.arc(x + w * 0.68, y + h * 0.7, w * 0.07, 0, Math.PI * 2);
    ctx.fill();
    if (cor === 'loco') {
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold ' + Math.round(h * 0.14) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CORINGA', x + w / 2, y + h * 0.2);
    }
  }

  function quadro(agora) {
    requestAnimationFrame(quadro);
    if (fundoChave !== String(view.w) + 'x' + view.h) {
      fundo = pintarFundo();
      fundoChave = String(view.w) + 'x' + view.h;
    }
    ctx.drawImage(fundo, 0, 0, view.w, view.h);
    if (!publico) return;

    // rotas ocupadas: primeiro todas as faixas, depois os vagões, e as cidades por cima de tudo
    var donas = publico.donas || {};
    var ids = Object.keys(donas);
    ['faixa', 'vagoes'].forEach(function (parte) {
      ids.forEach(function (id) {
        var r = MAPA.rotas[id];
        var j = publico.jogadores[donas[id]];
        if (!r || !j) return;
        var brilho = destaque && destaque.id === Number(id) && agora - destaque.t < 4000 && Math.floor((agora - destaque.t) / 250) % 2 === 0;
        desenharRota(ctx, r, j.cor, brilho, parte);
      });
    });
    if (ids.length) MAPA.cidades.forEach(function (cd) { desenharCidade(ctx, cd); });

    // painel dos jogadores (direita)
    var px = view.w - view.painel;
    ctx.fillStyle = '#111827';
    ctx.fillRect(px, 0, view.painel, view.h);
    var y = view.h * 0.02;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var rowH = Math.min(view.h * 0.15, (view.h * 0.8) / Math.max(1, publico.jogadores.length));
    publico.jogadores.forEach(function (jg, i) {
      var vez = publico.fase === 'jogo' && publico.vez === i;
      ctx.fillStyle = vez ? 'rgba(250,204,21,0.18)' : 'rgba(255,255,255,0.04)';
      ctx.fillRect(px + 8, y, view.painel - 16, rowH - 8);
      if (vez) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.strokeRect(px + 8, y, view.painel - 16, rowH - 8);
      }
      ctx.fillStyle = jg.cor;
      ctx.fillRect(px + 16, y + 10, 10, rowH - 28);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + Math.round(rowH * 0.2) + 'px sans-serif';
      ctx.fillText(jg.nome, px + 36, y + rowH * 0.22);
      ctx.fillStyle = '#fde047';
      ctx.textAlign = 'right';
      ctx.font = 'bold ' + Math.round(rowH * 0.26) + 'px sans-serif';
      ctx.fillText(String(jg.pontos), px + view.painel - 22, y + rowH * 0.24);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#cbd5e1';
      ctx.font = Math.round(rowH * 0.13) + 'px sans-serif';
      ctx.fillText('vagões ' + jg.vagoes + ' · cartas ' + jg.cartas, px + 36, y + rowH * 0.5);
      ctx.fillText('bilhetes ' + jg.bilhetes + (jg.escolhendo ? ' (escolhendo...)' : ''), px + 36, y + rowH * 0.7);
      y += rowH;
    });
    if (publico.ultimaVolta !== null && publico.fase === 'jogo') {
      ctx.fillStyle = Math.floor(agora / 500) % 2 ? '#fca5a5' : '#fde047';
      ctx.font = 'bold ' + Math.round(view.h * 0.026) + 'px sans-serif';
      ctx.fillText('ÚLTIMA VOLTA!', px + 16, y + 10);
    }
    ctx.fillStyle = '#64748b';
    ctx.font = Math.round(view.h * 0.02) + 'px sans-serif';
    ctx.fillText('Sala ' + sala, px + 16, view.h - view.h * 0.03);

    // base: cartas abertas, montes e o que aconteceu
    var by = view.h - view.base;
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, by, view.w - view.painel, view.base);
    var ch = view.base * 0.78;
    var cw = ch * 0.68;
    var cx = view.w * 0.015;
    (publico.abertas || []).forEach(function (c) {
      carta(cx, by + view.base * 0.1, cw, ch, c);
      cx += cw + 10;
    });
    cx += 14;
    carta(cx, by + view.base * 0.1, cw, ch, 'loco');
    ctx.fillStyle = 'rgba(120,53,15,0.92)';
    ctx.fillRect(cx, by + view.base * 0.1, cw, ch);
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.font = 'bold ' + Math.round(ch * 0.14) + 'px sans-serif';
    ctx.fillText('MONTE', cx + cw / 2, by + view.base * 0.1 + ch * 0.35);
    ctx.fillText(String(publico.monte), cx + cw / 2, by + view.base * 0.1 + ch * 0.6);
    cx += cw + 10;
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(cx, by + view.base * 0.1, cw, ch);
    ctx.fillStyle = '#78350f';
    ctx.fillText('BILHETES', cx + cw / 2, by + view.base * 0.1 + ch * 0.35);
    ctx.fillText(String(publico.bilhetesNoMonte), cx + cw / 2, by + view.base * 0.1 + ch * 0.6);
    cx += cw + 24;
    var vezJ = publico.fase === 'jogo' ? publico.jogadores[publico.vez] : null;
    ctx.textAlign = 'left';
    if (vezJ) {
      ctx.fillStyle = vezJ.cor;
      ctx.font = 'bold ' + Math.round(view.base * 0.2) + 'px sans-serif';
      ctx.fillText('Vez de ' + vezJ.nome + (publico.compradas ? ' (pegue mais 1 carta)' : ''), cx, by + view.base * 0.2);
    }
    ctx.fillStyle = '#e2e8f0';
    ctx.font = Math.round(view.base * 0.13) + 'px sans-serif';
    var linhas = (publico.log || []).slice(-4);
    linhas.forEach(function (l, k) {
      ctx.globalAlpha = 0.5 + (k / linhas.length) * 0.5;
      ctx.fillText(l, cx, by + view.base * (0.42 + k * 0.16));
    });
    ctx.globalAlpha = 1;
  }
  requestAnimationFrame(quadro);

  // ---------- som: apito de trem ao ocupar rota ----------

  var audio = null;
  function apito() {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      var t = audio.currentTime;
      [523, 659].forEach(function (f, i) {
        var o = audio.createOscillator();
        var gn = audio.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        gn.gain.setValueAtTime(0.0001, t + i * 0.02);
        gn.gain.exponentialRampToValueAtTime(0.12, t + 0.05);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        o.connect(gn);
        gn.connect(audio.destination);
        o.start(t);
        o.stop(t + 0.75);
      });
    } catch (e) {}
  }

  // ---------- tela cheia ----------

  document.getElementById('telaCheia').addEventListener('click', function () {
    var el = document.documentElement;
    if (audio && audio.state === 'suspended') audio.resume();
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  });

  iniciar();
})();
