// Celular: sua mão secreta. Mostra suas cartas e bilhetes e manda as jogadas para a TV pelo Firebase.
(function () {
  var MAPA = window.MAPA;
  var CORES_CARTA = {
    vermelho: '#dc2626', azul: '#2563eb', verde: '#16a34a', amarelo: '#ca8a04', laranja: '#ea580c',
    roxo: '#9333ea', preto: '#1f2937', branco: '#e2e8f0', cinza: '#6b7280', loco: '#0f172a',
  };
  var NOME_CARTA = { loco: 'coringa' };
  var ORDEM = ['vermelho', 'azul', 'verde', 'amarelo', 'laranja', 'roxo', 'preto', 'branco', 'loco'];
  var tela = document.getElementById('tela');
  var params = new URLSearchParams(location.search);
  var sala = (params.get('sala') || '').toUpperCase();
  var key = null;
  var publico = null;
  var minha = null;
  var ultimoErro = 0;
  var escolha = {};
  var filtroRota = ''; // busca de cidade na lista de rotas (sobrevive às atualizações da tela)

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  }
  function cidade(i) { return MAPA.cidades[i].nome; }

  // ---------- entrar ----------

  if (!/^[A-Z0-9]{5}$/.test(sala)) {
    location.href = 'entrar.html';
    return;
  }

  // cada celular guarda sua chave secreta por sala (?j=2 cria outro jogador no mesmo aparelho, para testes)
  var slotKey = 'trilhosKey_' + sala + (params.get('j') || '');
  key = ls(slotKey);
  if (!key) {
    key = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    ls(slotKey, key);
  }

  function enviar(acao) {
    acao.key = key;
    acao.t = Date.now();
    return FB.push('salas/' + sala + '/acoes', acao).catch(function () { mostrarErro('Sem conexão. Tente de novo.'); });
  }

  function mostrarErro(msg) {
    var el = document.getElementById('erro');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(mostrarErro.t);
    mostrarErro.t = setTimeout(function () { el.classList.add('hidden'); }, 3500);
  }

  FB.listen('salas/' + sala + '/publico', function (d) {
    publico = d;
    document.getElementById('status').textContent = 'sala ' + sala;
    desenhar();
  });
  FB.listen('salas/' + sala + '/maos/' + key, function (d) {
    var e = d && d.erro;
    if (e && e.t > ultimoErro) {
      if (Date.now() - e.t < 15000) mostrarErro(e.msg);
      ultimoErro = e.t;
    }
    minha = d && d.indice !== undefined ? d : null;
    desenhar();
  });

  function eu() {
    if (!publico || !publico.jogadores) return null;
    var tag = key.slice(-4);
    for (var i = 0; i < publico.jogadores.length; i++) if (publico.jogadores[i].tag === tag) return i;
    return null;
  }

  // ---------- telas ----------

  function desenhar() {
    if (!publico) {
      tela.innerHTML = '<p>Procurando a sala ' + esc(sala) + '... Ela foi aberta na TV?</p>';
      return;
    }
    var idx = eu();
    var euJ = idx === null ? null : publico.jogadores[idx];
    if (euJ) {
      document.documentElement.style.setProperty('--c', euJ.cor);
      document.getElementById('titulo').textContent = euJ.nome + ' · ' + euJ.nomeCor;
    }
    if (publico.fase === 'sala') return telaSala(idx);
    if (idx === null) {
      tela.innerHTML = '<p>Essa partida já começou sem você.</p><p class="dica">Peça para o primeiro jogador tocar em "Encerrar partida e voltar para a sala" no celular dele. Aí você consegue entrar.</p>';
      return;
    }
    if (publico.fase === 'fim') return telaFim(idx);
    if (!minha) {
      tela.innerHTML = '<p>Carregando sua mão...</p>';
      return;
    }
    if (minha.pendentes && minha.pendentes.length) return telaBilhetes();
    telaJogo(idx);
  }

  function telaSala(idx) {
    var html = '';
    if (idx === null) {
      html += '<h3>Seu nome</h3><input class="nome" id="nome" maxlength="14" placeholder="Como quer aparecer na TV" value="' + esc(ls('trilhosNome') || '') + '">' +
        '<button class="botao" id="entrar">Entrar na partida</button>';
    } else {
      html += '<div class="vez minha">Você entrou! Esperando o início...</div>' +
        '<button class="botao sec" id="mudarNome">Mudar meu nome</button>' +
        '<button class="botao sec" id="sair">Sair da sala</button>';
    }
    html += '<h3>Na sala</h3>';
    (publico.jogadores || []).forEach(function (j) {
      html += '<div class="rota"><span class="faixa" style="background:' + j.cor + '"></span><span class="txt"><b>' + esc(j.nome) + '</b></span></div>';
    });
    if (idx === 0) {
      html += '<button class="botao" id="comecar"' + ((publico.jogadores || []).length < 2 ? ' disabled' : '') + '>COMEÇAR</button>' +
        '<p class="dica">Comece quando todo mundo tiver entrado (2 a 5 jogadores).</p>';
    }
    tela.innerHTML = html;
    var b = document.getElementById('entrar');
    if (b) {
      b.onclick = function () {
        var nome = document.getElementById('nome').value.trim() || 'Jogador';
        ls('trilhosNome', nome);
        b.disabled = true;
        enviar({ tipo: 'entrar', nome: nome });
      };
    }
    var c = document.getElementById('comecar');
    if (c) c.onclick = function () { c.disabled = true; enviar({ tipo: 'comecar' }); };
    var s = document.getElementById('sair');
    if (s) {
      s.onclick = function () {
        if (!confirm('Sair da sala?')) return;
        s.disabled = true;
        enviar({ tipo: 'sair' });
      };
    }
    ligarOpcoes(false);
  }

  // ---------- opções: trocar nome e (para o Jogador 1) encerrar a partida ----------

  function opcoesHtml(idx, fim) {
    var html = '<h3>Opções</h3><button class="botao sec" id="mudarNome">Mudar meu nome</button>';
    if (idx === 0) {
      html += '<button class="botao sec" id="voltarSala">' + (fim ? 'Nova partida (voltar para a sala)' : 'Encerrar partida e voltar para a sala') + '</button>' +
        '<p class="dica">Na sala dá para outras pessoas entrarem antes de começar de novo.</p>';
    } else {
      html += '<p class="dica">Para encerrar ou recomeçar, o primeiro jogador usa o botão nas opções dele.</p>';
    }
    return html;
  }

  function ligarOpcoes(fim) {
    var m = document.getElementById('mudarNome');
    if (m) {
      m.onclick = function () {
        var idx = eu();
        var atual = idx === null ? '' : publico.jogadores[idx].nome;
        var nome = prompt('Seu nome (até 14 letras):', atual);
        if (!nome || !nome.trim()) return;
        ls('trilhosNome', nome.trim());
        enviar({ tipo: 'renomear', nome: nome.trim() });
      };
    }
    var v = document.getElementById('voltarSala');
    if (v) {
      v.onclick = function () {
        if (!fim && !confirm('Encerrar a partida para todos e voltar para a sala?')) return;
        v.disabled = true;
        enviar({ tipo: 'voltarSala' });
      };
    }
  }

  // cada bilhete tem uma cor no mapinha (bolinha igual aparece no bilhete)
  var CORES_BILHETE = ['#e11d48', '#2563eb', '#d97706', '#059669', '#9333ea', '#0891b2', '#db2777', '#65a30d', '#7c2d12', '#4f46e5'];

  function bilheteHtml(id, extra, marca) {
    var b = MAPA.bilhetes[id];
    return (marca ? '<span class="marca" style="background:' + marca + '"></span>' : '') +
      cidade(b.a) + ' → ' + cidade(b.b) + '<span class="pts">' + b.pontos + '</span>' + (extra || '');
  }

  // mapinha só no seu celular: rotas, trens já colocados e as cidades dos seus bilhetes
  function desenharMiniMapa(canvas, bilhetes) {
    var w = canvas.clientWidth || 360;
    var h = Math.round((w * MAPA.altura) / MAPA.largura);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.height = h + 'px';
    var g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var s = w / MAPA.largura;
    function P(c) { return [c.x * s, c.y * s]; }
    g.fillStyle = '#6b9a45';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3b82c4';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(0, 18 * s);
    g.lineTo(w, 12 * s);
    g.stroke();
    var donas = (publico && publico.donas) || {};
    MAPA.rotas.forEach(function (r) {
      var a = P(MAPA.cidades[r.a]);
      var b = P(MAPA.cidades[r.b]);
      var dona = donas[r.id];
      g.strokeStyle = dona !== undefined ? publico.jogadores[dona].cor : 'rgba(255,255,255,0.35)';
      g.lineWidth = dona !== undefined ? 4 : 1.5;
      g.beginPath();
      g.moveTo(a[0], a[1]);
      g.lineTo(b[0], b[1]);
      g.stroke();
    });
    MAPA.cidades.forEach(function (c) {
      var p = P(c);
      g.fillStyle = '#fff7ed';
      g.beginPath();
      g.arc(p[0], p[1], 2.5, 0, Math.PI * 2);
      g.fill();
    });
    g.font = 'bold 10px sans-serif';
    g.textAlign = 'center';
    bilhetes.forEach(function (bt) {
      var b = MAPA.bilhetes[bt.id];
      var A = P(MAPA.cidades[b.a]);
      var B = P(MAPA.cidades[b.b]);
      g.strokeStyle = bt.cor;
      g.lineWidth = 2.5;
      g.setLineDash([5, 4]);
      g.beginPath();
      g.moveTo(A[0], A[1]);
      g.lineTo(B[0], B[1]);
      g.stroke();
      g.setLineDash([]);
      [[A, b.a], [B, b.b]].forEach(function (pc) {
        g.fillStyle = bt.cor;
        g.strokeStyle = '#fff';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(pc[0][0], pc[0][1], 6, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        var nome = cidade(pc[1]);
        var ty = pc[0][1] - 9;
        g.lineWidth = 3;
        g.strokeStyle = 'rgba(0,0,0,0.75)';
        g.strokeText(nome, Math.min(w - 30, Math.max(30, pc[0][0])), Math.max(10, ty));
        g.fillStyle = '#fff';
        g.fillText(nome, Math.min(w - 30, Math.max(30, pc[0][0])), Math.max(10, ty));
      });
    });
  }

  function telaBilhetes() {
    var html = '<div class="vez minha">Escolha seus bilhetes de destino</div>' +
      '<p>Ligue as duas cidades com seus trens até o fim do jogo para ganhar os pontos. Se não ligar, perde os pontos! Fique com pelo menos <b>' + minha.minimo + '</b>.</p>' +
      '<canvas class="minimapa" id="mini"></canvas>';
    var marcados = [];
    minha.pendentes.forEach(function (id, i) {
      if (escolha[id] === undefined) escolha[id] = true;
      var cor = CORES_BILHETE[i % CORES_BILHETE.length];
      marcados.push({ id: id, cor: cor });
      html += '<div class="bilhete' + (escolha[id] ? '' : ' fora') + '"><label><input type="checkbox" data-b="' + id + '"' + (escolha[id] ? ' checked' : '') + '>' + bilheteHtml(id, '', cor) + '</label></div>';
    });
    if (minha.bilhetes && minha.bilhetes.length) {
      html += '<p class="dica">Você já tem: ' + minha.bilhetes.map(function (b) { var x = MAPA.bilhetes[b.id]; return cidade(x.a) + ' → ' + cidade(x.b); }).join(', ') + '</p>';
    }
    html += '<button class="botao" id="confirmar">Confirmar</button>' + opcoesHtml(eu(), false);
    tela.innerHTML = html;
    // o mapinha mostra só os bilhetes marcados: desmarcou, o trajeto some
    function redesenhar() {
      desenharMiniMapa(document.getElementById('mini'), marcados.filter(function (m) { return escolha[m.id]; }));
    }
    redesenhar();
    ligarOpcoes(false);
    tela.querySelectorAll('[data-b]').forEach(function (cb) {
      cb.onchange = function () {
        escolha[cb.getAttribute('data-b')] = cb.checked;
        cb.closest('.bilhete').classList.toggle('fora', !cb.checked);
        redesenhar();
      };
    });
    document.getElementById('confirmar').onclick = function () {
      var ficar = minha.pendentes.filter(function (id) { return escolha[id]; });
      if (ficar.length < minha.minimo) return mostrarErro('Fique com pelo menos ' + minha.minimo + '.');
      escolha = {};
      this.disabled = true;
      enviar({ tipo: 'escolherBilhetes', ficar: ficar });
    };
  }

  function cartaHtml(cor, n, attrs) {
    var label = NOME_CARTA[cor] || cor;
    var texto = cor === 'branco' || cor === 'amarelo' ? '#111' : '#fff';
    var borda = cor === 'loco' ? '#facc15' : 'rgba(255,255,255,.7)';
    return '<' + (attrs ? 'button ' + attrs : 'div') + ' class="carta" style="background:' + CORES_CARTA[cor] + ';border-color:' + borda + ';color:' + texto + '">' +
      '<small>' + label + '</small>' + (n === undefined ? '' : n) + '</' + (attrs ? 'button' : 'div') + '>';
  }

  function telaJogo(idx) {
    var minhaVez = publico.vez === idx;
    var vezJ = publico.jogadores[publico.vez];
    var compradas = publico.compradas || 0;
    var euJ = publico.jogadores[idx];
    var html = '<div class="vez' + (minhaVez ? ' minha' : '') + '">' +
      (minhaVez ? (compradas ? 'Pegue mais 1 carta' : 'Sua vez! Escolha UMA ação') : 'Vez de ' + esc(vezJ.nome)) + '</div>';
    if (publico.ultimaVolta !== null && publico.ultimaVolta !== undefined) html += '<p style="color:#fca5a5"><b>Última volta!</b></p>';

    // minha mão primeiro: assim dá para comparar com as cartas da mesa antes de comprar
    html += '<h3>Minha mão · ' + euJ.vagoes + ' vagões</h3><div class="mao">';
    var temCarta = false;
    ORDEM.forEach(function (c) {
      var n = (minha.mao || {})[c];
      if (n) {
        html += cartaHtml(c, n);
        temCarta = true;
      }
    });
    if (!temCarta) html += '<p class="dica">Sem cartas.</p>';
    html += '</div>';

    html += '<h3>1. Pegar cartas</h3><div class="mao">';
    (publico.abertas || []).forEach(function (c, i) {
      var pode = minhaVez && !(c === 'loco' && compradas > 0);
      html += cartaHtml(c, undefined, 'data-aberta="' + i + '"' + (pode ? '' : ' disabled'));
    });
    html += '<button class="carta monte" data-monte="1"' + (minhaVez ? '' : ' disabled') + '><small>monte</small>?</button></div>';
    html += '<p class="dica">Pegue 2 cartas. Coringa aberto conta como 2.</p>';

    html += '<h3>2. Ocupar uma rota</h3>';
    var temRotas = minhaVez && !compradas && minha.possiveis && minha.possiveis.length;
    if (!minhaVez || compradas) html += '<p class="dica">Na sua vez, aparecem aqui as rotas que dá para ocupar.</p>';
    else if (!temRotas) html += '<p class="dica">Nenhuma rota possível agora: junte mais cartas da mesma cor.</p>';
    else {
      html += '<div class="filtro"><input class="nome" id="filtroRota" placeholder="Buscar cidade (ex.: pato)" value="' + esc(filtroRota) + '" autocomplete="off">' +
        '<button class="botao sec" id="limparFiltro" style="width:auto;margin:0 0 10px;padding:0 16px">✕</button></div><div id="listaRotas"></div>';
    }

    html += '<h3>3. Novos bilhetes</h3><button class="botao sec" id="pedirBilhetes"' + (minhaVez && !compradas ? '' : ' disabled') + '>Pegar 3 bilhetes (fico com 1 ou mais)</button>';

    html += '<h3>Meus bilhetes</h3>';
    var marcados = [];
    (minha.bilhetes || []).forEach(function (b, i) {
      var cor = CORES_BILHETE[i % CORES_BILHETE.length];
      marcados.push({ id: b.id, cor: cor });
      html += '<div class="bilhete' + (b.ok ? ' ok' : '') + '">' + bilheteHtml(b.id, b.ok ? ' ✓' : '', cor) + '</div>';
    });
    html += '<canvas class="minimapa" id="mini"></canvas><p class="dica">Só você vê esse mapa: tracejado = seus bilhetes, linhas grossas = trens de cada jogador.</p>';
    html += opcoesHtml(idx, false);
    // se a pessoa estava digitando na busca, continua digitando depois que a tela atualiza
    var digitando = document.activeElement && document.activeElement.id === 'filtroRota';
    tela.innerHTML = html;
    desenharMiniMapa(document.getElementById('mini'), marcados);
    ligarOpcoes(false);
    if (temRotas) {
      var campo = document.getElementById('filtroRota');
      campo.oninput = function () {
        filtroRota = campo.value;
        listarRotas();
      };
      document.getElementById('limparFiltro').onclick = function () {
        filtroRota = '';
        campo.value = '';
        listarRotas();
      };
      listarRotas();
      if (digitando) {
        campo.focus();
        campo.setSelectionRange(campo.value.length, campo.value.length);
      }
    }

    tela.querySelectorAll('[data-aberta]').forEach(function (b) {
      b.onclick = function () { travar(); enviar({ tipo: 'comprarAberta', idx: Number(b.getAttribute('data-aberta')) }); };
    });
    var monte = tela.querySelector('[data-monte]');
    if (monte) monte.onclick = function () { travar(); enviar({ tipo: 'comprarMonte' }); };
    var pb = document.getElementById('pedirBilhetes');
    if (pb) pb.onclick = function () { travar(); enviar({ tipo: 'pedirBilhetes' }); };
  }

  // busca sem acento e sem diferença de maiúsculas: "pato" acha Pato Branco, "vere" acha Verê
  function semAcento(t) {
    return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function listarRotas() {
    var alvo = document.getElementById('listaRotas');
    if (!alvo) return;
    var busca = semAcento(filtroRota);
    var todas = minha.possiveis.slice().sort(function (a, b) { return MAPA.rotas[b.rota].n - MAPA.rotas[a.rota].n; });
    var lista = todas.filter(function (p) {
      var r = MAPA.rotas[p.rota];
      return !busca || semAcento(cidade(r.a)).indexOf(busca) !== -1 || semAcento(cidade(r.b)).indexOf(busca) !== -1;
    });
    var html = busca ? '<p class="dica">' + lista.length + ' de ' + todas.length + ' rotas possíveis com "' + esc(filtroRota.trim()) + '"</p>' : '';
    if (!lista.length) html += '<p class="dica">Nenhuma rota que você consegue fechar agora passa por essa cidade.</p>';
    lista.forEach(function (p) {
      var r = MAPA.rotas[p.rota];
      html += '<div class="rota"><span class="faixa" style="background:' + CORES_CARTA[r.cor] + '"></span><span class="txt"><b>' +
        esc(cidade(r.a)) + ' — ' + esc(cidade(r.b)) + '</b>' + r.n + ' vagão(ões) · ' + (r.cor === 'cinza' ? 'qualquer cor' : r.cor) + '</span><div class="pagar">';
      p.opcoes.forEach(function (cor) {
        var claro = cor === 'branco' || cor === 'amarelo';
        html += '<button data-rota="' + p.rota + '" data-cor="' + cor + '" style="background:' + CORES_CARTA[cor] +
          (claro ? ';color:#111;text-shadow:none' : '') + '">Pagar ' + (NOME_CARTA[cor] || cor) + '</button>';
      });
      html += '</div></div>';
    });
    alvo.innerHTML = html;
    alvo.querySelectorAll('[data-rota]').forEach(function (b) {
      b.onclick = function () { travar(); enviar({ tipo: 'ocupar', rota: Number(b.getAttribute('data-rota')), cor: b.getAttribute('data-cor') }); };
    });
  }

  // evita toque duplo enquanto a TV responde
  function travar() {
    tela.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
  }

  function telaFim(idx) {
    var r = publico.resultado[idx];
    var venci = publico.vencedores.indexOf(idx) !== -1;
    var html = '<div class="vez minha">' + (venci ? 'Você venceu! 🚂' : 'Fim de jogo!') + '</div>' +
      '<h3>Seus pontos</h3><p>Rotas: ' + r.rotas + '<br>Bilhetes feitos: +' + r.bilhetes + '<br>Bilhetes não feitos: −' + r.perdidos +
      '<br>Maior caminho: ' + r.caminho + (r.bonus ? ' (+' + r.bonus + ' de bônus)' : '') + '<br><b>Total: ' + r.total + '</b></p>';
    (publico.jogadores[idx].bilhetesFim || []).forEach(function (b) {
      html += '<div class="bilhete' + (b.ok ? ' ok' : '') + '">' + bilheteHtml(b.id, b.ok ? ' ✓' : ' ✗') + '</div>';
    });
    html += opcoesHtml(idx, true);
    tela.innerHTML = html;
    ligarOpcoes(true);
  }
})();
