// Sala compartilhada pelos jogos novos (Safra, Expedição).
//  - Na TV: cria/recupera a sala, mostra QR, recebe as jogadas pelo Firebase, aplica as regras e publica.
//  - No celular: entrar com nome, sala de espera, opções (trocar nome, sair, encerrar) e envio de jogadas.
// Escrito em JavaScript simples para funcionar no navegador da TV de 2019.
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  }
  function novoCodigo() {
    var letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var c = '';
    for (var i = 0; i < 5; i++) c += letras.charAt(Math.floor(Math.random() * letras.length));
    return c;
  }

  // ================= TV =================
  // cfg = { jogo, nomeJogo, regras: { min, max, comecar, acao, publica(s), privada(s, idx), normalizar(s) }, aoMudar(publico) }
  function iniciarTV(cfg) {
    var params = new URLSearchParams(location.search);
    var chave = 'sala_' + cfg.jogo;
    var sala = params.get('sala') || (params.get('nova') ? null : ls(chave)) || novoCodigo();
    ls(chave, sala);
    if (params.get('sala') !== sala) history.replaceState(null, '', 'tv.html?sala=' + sala);
    var estado = null;
    var publico = null;
    var processadas = {};
    var fila = Promise.resolve();
    var link = location.href.replace(/tv\.html.*$/, '') + 'celular.html?sala=' + sala;

    document.getElementById('codigo').textContent = sala;
    document.getElementById('link').textContent = link;
    if (window.QRCode) new QRCode(document.getElementById('qr'), { text: link, width: 340, height: 340 });
    var fs = document.getElementById('telaCheia');
    if (fs) {
      fs.onclick = function () {
        var el = document.documentElement;
        if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        else if (el.requestFullscreen) el.requestFullscreen();
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      };
    }

    function publicar(erros) {
      erros = erros || {};
      var jogando = estado.fase !== 'sala';
      publico = jogando ? cfg.regras.publica(estado) : {};
      publico.sala = sala;
      publico.jogo = cfg.jogo;
      publico.fase = estado.fase;
      publico.log = estado.log || [];
      publico.versao = estado.versao;
      var extras = publico.jogadores || [];
      publico.jogadores = estado.jogadores.map(function (j, i) {
        var base = { tag: j.key.slice(-4), nome: j.nome, cor: j.cor, nomeCor: j.nomeCor };
        var e = extras[i] || {};
        for (var k in e) base[k] = e[k];
        return base;
      });
      var up = { estado: estado, publico: publico };
      if (jogando) {
        estado.jogadores.forEach(function (j, i) {
          var mao = cfg.regras.privada(estado, i);
          mao.indice = i;
          if (erros[j.key]) {
            mao.erro = erros[j.key];
            delete erros[j.key];
          }
          up['maos/' + j.key] = mao;
        });
        for (var e2 in erros) up['maos/' + e2 + '/erro'] = erros[e2];
      } else {
        var vazias = {};
        for (var e3 in erros) vazias[e3] = { erro: erros[e3] };
        up.maos = Object.keys(vazias).length ? vazias : null;
      }
      telaSala();
      cfg.aoMudar(publico);
      return FB.patch('salas/' + sala, up).catch(function (err) { console.error(err); });
    }

    function processar(id, acao) {
      var erro = SALA_REGRAS.aplicar(estado, cfg.regras, acao.key, acao);
      estado.versao = (estado.versao || 0) + 1;
      var erros = {};
      if (erro && acao.key) erros[acao.key] = { msg: erro, t: Date.now() };
      return publicar(erros).then(function () { return FB.del('salas/' + sala + '/acoes/' + id); });
    }

    function telaSala() {
      var naSala = estado.fase === 'sala';
      document.getElementById('telaSala').classList.toggle('hidden', !naSala);
      if (!naSala) return;
      var html = '';
      estado.jogadores.forEach(function (j, i) {
        html += '<div><span class="bola" style="background:' + j.cor + '"></span>' + esc(j.nome) + (i === 0 ? ' (começa a partida)' : '') + '</div>';
      });
      document.getElementById('listaJog').innerHTML = html;
      document.getElementById('dicaComecar').textContent = estado.jogadores.length >= cfg.regras.min
        ? estado.jogadores[0].nome + ': aperte COMEÇAR no celular quando todos entrarem.'
        : 'Esperando jogadores (' + cfg.regras.min + ' a ' + cfg.regras.max + ')...';
    }

    FB.get('salas/' + sala + '/estado').then(function (salvo) {
      // a TV pode recarregar no meio da partida: continua de onde parou
      if (salvo && salvo.sala === sala && salvo.jogo === cfg.jogo) {
        estado = salvo;
        estado.jogadores = estado.jogadores || [];
        estado.log = estado.log || [];
        if (estado.fase !== 'sala') cfg.regras.normalizar(estado);
      } else {
        estado = SALA_REGRAS.novoEstado(sala, cfg.jogo);
      }
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
    return { sala: sala };
  }

  // ================= Celular =================
  // cfg = { jogo, nomeJogo, desenhar(api) } ; api.publico, api.minha, api.idx, api.enviar(acao), api.opcoes(fim) ...
  function iniciarCelular(cfg) {
    var tela = document.getElementById('tela');
    var params = new URLSearchParams(location.search);
    var sala = (params.get('sala') || '').toUpperCase();
    var publico = null;
    var minha = null;
    var ultimoErro = 0;

    if (!/^[A-Z0-9]{5}$/.test(sala)) {
      location.href = '../entrar.html';
      return;
    }
    var slot = 'key_' + sala + (params.get('j') || '');
    var key = ls(slot);
    if (!key) {
      key = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      ls(slot, key);
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
    function eu() {
      if (!publico || !publico.jogadores) return null;
      for (var i = 0; i < publico.jogadores.length; i++) if (publico.jogadores[i].tag === key.slice(-4)) return i;
      return null;
    }
    function travar() {
      tela.querySelectorAll('button').forEach(function (b) { b.disabled = true; });
    }

    function opcoes(fim) {
      var idx = eu();
      var html = '<h3>Opções</h3><button class="botao sec" data-op="nome">Mudar meu nome</button>';
      if (idx === 0) {
        html += '<button class="botao sec" data-op="voltar">' + (fim ? 'Nova partida (voltar para a sala)' : 'Encerrar partida e voltar para a sala') + '</button>';
      } else {
        html += '<p class="dica">Para encerrar ou recomeçar, o primeiro jogador usa o botão nas opções dele.</p>';
      }
      return html;
    }

    // botões de opções funcionam em qualquer tela (delegação de clique)
    tela.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-op]') : null;
      if (!b) return;
      var op = b.getAttribute('data-op');
      if (op === 'nome') {
        var idx = eu();
        var nome = prompt('Seu nome (até 14 letras):', idx === null ? '' : publico.jogadores[idx].nome);
        if (nome && nome.trim()) {
          ls('nomeJogador', nome.trim());
          enviar({ tipo: 'renomear', nome: nome.trim() });
        }
      } else if (op === 'voltar') {
        var fim = publico && publico.fase === 'fim';
        if (!fim && !confirm('Encerrar a partida para todos e voltar para a sala?')) return;
        enviar({ tipo: 'voltarSala' });
      } else if (op === 'sair') {
        if (confirm('Sair da sala?')) enviar({ tipo: 'sair' });
      } else if (op === 'comecar') {
        b.disabled = true;
        enviar({ tipo: 'comecar' });
      } else if (op === 'entrar') {
        var n = (document.getElementById('nome').value || '').trim() || 'Jogador';
        ls('nomeJogador', n);
        b.disabled = true;
        enviar({ tipo: 'entrar', nome: n });
      }
    });

    function telaSala(idx) {
      var html = '';
      if (idx === null) {
        html += '<h3>Seu nome</h3><input class="nome" id="nome" maxlength="14" placeholder="Como quer aparecer na TV" value="' + esc(ls('nomeJogador') || '') + '">' +
          '<button class="botao" data-op="entrar">Entrar na partida</button>';
      } else {
        html += '<div class="vez minha">Você entrou! Esperando o início...</div>' +
          '<button class="botao sec" data-op="nome">Mudar meu nome</button><button class="botao sec" data-op="sair">Sair da sala</button>';
      }
      html += '<h3>Na sala</h3>';
      (publico.jogadores || []).forEach(function (j) {
        html += '<div class="rota"><span class="faixa" style="background:' + j.cor + '"></span><span class="txt"><b>' + esc(j.nome) + '</b></span></div>';
      });
      if (idx === 0) html += '<button class="botao" data-op="comecar">COMEÇAR</button><p class="dica">Comece quando todo mundo tiver entrado.</p>';
      tela.innerHTML = html;
    }

    function desenhar() {
      if (!publico) {
        tela.innerHTML = '<p>Procurando a sala ' + esc(sala) + '... Ela foi aberta na TV?</p>';
        return;
      }
      var idx = eu();
      if (idx !== null) {
        var j = publico.jogadores[idx];
        document.documentElement.style.setProperty('--c', j.cor);
        document.getElementById('titulo').textContent = j.nome + ' · ' + j.nomeCor;
      }
      if (publico.fase === 'sala') return telaSala(idx);
      if (idx === null) {
        tela.innerHTML = '<p>Essa partida já começou sem você.</p><p class="dica">Peça para o primeiro jogador tocar em "Encerrar partida e voltar para a sala".</p>';
        return;
      }
      if (!minha) {
        tela.innerHTML = '<p>Carregando...</p>';
        return;
      }
      cfg.desenhar({ publico: publico, minha: minha, idx: idx, enviar: enviar, travar: travar, opcoes: opcoes, esc: esc, erro: mostrarErro, tela: tela, redesenhar: desenhar });
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
  }

  window.SALA = { iniciarTV: iniciarTV, iniciarCelular: iniciarCelular, esc: esc };
})();
