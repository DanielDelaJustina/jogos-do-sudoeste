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
    tela.innerHTML = '<h3>Entrar numa sala</h3><p>Digite o código que aparece na TV:</p>' +
      '<input id="cod" maxlength="5" placeholder="EX: K7P2Q"><button class="botao" id="ir">Entrar</button>';
    document.getElementById('ir').onclick = function () {
      location.href = 'celular.html?sala=' + document.getElementById('cod').value.trim().toUpperCase();
    };
    document.getElementById('status').textContent = '';
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
      tela.innerHTML = '<p>Essa partida já começou sem você. Espere a próxima!</p>';
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
      html += '<div class="vez minha">Você entrou! Esperando o início...</div>';
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
  }

  function bilheteHtml(id, extra) {
    var b = MAPA.bilhetes[id];
    return cidade(b.a) + ' → ' + cidade(b.b) + '<span class="pts">' + b.pontos + '</span>' + (extra || '');
  }

  function telaBilhetes() {
    var html = '<div class="vez minha">Escolha seus bilhetes de destino</div>' +
      '<p>Ligue as duas cidades com seus trens até o fim do jogo para ganhar os pontos. Se não ligar, perde os pontos! Fique com pelo menos <b>' + minha.minimo + '</b>.</p>';
    minha.pendentes.forEach(function (id) {
      if (escolha[id] === undefined) escolha[id] = true;
      html += '<div class="bilhete"><label><input type="checkbox" data-b="' + id + '"' + (escolha[id] ? ' checked' : '') + '>' + bilheteHtml(id) + '</label></div>';
    });
    html += '<button class="botao" id="confirmar">Confirmar</button>';
    tela.innerHTML = html;
    tela.querySelectorAll('[data-b]').forEach(function (cb) {
      cb.onchange = function () { escolha[cb.getAttribute('data-b')] = cb.checked; };
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

    html += '<h3>1. Pegar cartas</h3><div class="mao">';
    (publico.abertas || []).forEach(function (c, i) {
      var pode = minhaVez && !(c === 'loco' && compradas > 0);
      html += cartaHtml(c, undefined, 'data-aberta="' + i + '"' + (pode ? '' : ' disabled'));
    });
    html += '<button class="carta monte" data-monte="1"' + (minhaVez ? '' : ' disabled') + '><small>monte</small>?</button></div>';
    html += '<p class="dica">Pegue 2 cartas. Coringa aberto conta como 2.</p>';

    html += '<h3>2. Ocupar uma rota</h3>';
    if (!minhaVez || compradas) html += '<p class="dica">Na sua vez, aparecem aqui as rotas que dá para ocupar.</p>';
    else if (!minha.possiveis || !minha.possiveis.length) html += '<p class="dica">Nenhuma rota possível agora: junte mais cartas da mesma cor.</p>';
    else {
      minha.possiveis.slice().sort(function (a, b) { return MAPA.rotas[b.rota].n - MAPA.rotas[a.rota].n; }).forEach(function (p) {
        var r = MAPA.rotas[p.rota];
        html += '<div class="rota"><span class="faixa" style="background:' + CORES_CARTA[r.cor] + '"></span><span class="txt"><b>' +
          esc(cidade(r.a)) + ' — ' + esc(cidade(r.b)) + '</b>' + r.n + ' vagão(ões) · ' + (r.cor === 'cinza' ? 'qualquer cor' : r.cor) + '</span>';
        p.opcoes.forEach(function (cor) {
          html += '<button data-rota="' + p.rota + '" data-cor="' + cor + '" style="background:' + CORES_CARTA[cor] + '">Pagar ' + (NOME_CARTA[cor] || cor) + '</button>';
        });
        html += '</div>';
      });
    }

    html += '<h3>3. Novos bilhetes</h3><button class="botao sec" id="pedirBilhetes"' + (minhaVez && !compradas ? '' : ' disabled') + '>Pegar 3 bilhetes (fico com 1 ou mais)</button>';

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
    html += '</div><h3>Meus bilhetes</h3>';
    (minha.bilhetes || []).forEach(function (b) {
      html += '<div class="bilhete' + (b.ok ? ' ok' : '') + '">' + bilheteHtml(b.id, b.ok ? ' ✓' : '') + '</div>';
    });
    tela.innerHTML = html;

    tela.querySelectorAll('[data-aberta]').forEach(function (b) {
      b.onclick = function () { travar(); enviar({ tipo: 'comprarAberta', idx: Number(b.getAttribute('data-aberta')) }); };
    });
    var monte = tela.querySelector('[data-monte]');
    if (monte) monte.onclick = function () { travar(); enviar({ tipo: 'comprarMonte' }); };
    tela.querySelectorAll('[data-rota]').forEach(function (b) {
      b.onclick = function () { travar(); enviar({ tipo: 'ocupar', rota: Number(b.getAttribute('data-rota')), cor: b.getAttribute('data-cor') }); };
    });
    var pb = document.getElementById('pedirBilhetes');
    if (pb) pb.onclick = function () { travar(); enviar({ tipo: 'pedirBilhetes' }); };
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
    tela.innerHTML = html;
  }
})();
