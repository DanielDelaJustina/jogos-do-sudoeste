// Regras de sala comuns aos jogos novos (Safra, Expedição): entrar, trocar nome, sair,
// começar e voltar para a sala. Cada jogo fornece só as regras dele (comecar, acao, visões).
(function (root) {
  var CORES = ['#2563eb', '#dc2626', '#16a34a', '#eab308', '#9333ea'];
  var NOMES = ['Azul', 'Vermelho', 'Verde', 'Amarelo', 'Roxo'];

  function log(s, txt) {
    s.log = s.log || [];
    s.log.push(txt);
    if (s.log.length > 6) s.log.shift();
  }

  function recolorir(s) {
    s.jogadores.forEach(function (j, i) {
      j.cor = CORES[i];
      j.nomeCor = NOMES[i];
    });
  }

  function nomeLimpo(n, padrao) {
    return String(n || '').trim().slice(0, 14) || padrao;
  }

  function novoEstado(sala, jogo) {
    return { sala: sala, jogo: jogo, fase: 'sala', jogadores: [], log: ['Sala criada. Entrem pelo celular!'], versao: 1 };
  }

  // jogo = { min, max, comecar(s), acao(s, idx, acao) -> erro|null, limpar(s) }
  function aplicar(s, jogo, key, acao) {
    var idx = -1;
    for (var i = 0; i < s.jogadores.length; i++) if (s.jogadores[i].key === key) idx = i;
    var j = idx >= 0 ? s.jogadores[idx] : null;

    if (acao.tipo === 'entrar' || acao.tipo === 'renomear') {
      if (j) {
        var novo = nomeLimpo(acao.nome, j.nome);
        if (novo !== j.nome) log(s, j.nome + ' agora é ' + novo + '.');
        j.nome = novo;
        return null;
      }
      if (acao.tipo === 'renomear') return 'Jogador não encontrado.';
      if (s.fase !== 'sala') return 'A partida já começou. Peça para o primeiro jogador voltar para a sala.';
      if (s.jogadores.length >= jogo.max) return 'A sala está cheia (' + jogo.max + ' jogadores).';
      s.jogadores.push({ key: key, nome: nomeLimpo(acao.nome, 'Jogador ' + (s.jogadores.length + 1)) });
      recolorir(s);
      log(s, s.jogadores[s.jogadores.length - 1].nome + ' entrou.');
      return null;
    }
    if (!j) return 'Jogador não encontrado.';
    if (acao.tipo === 'sair') {
      if (s.fase !== 'sala') return 'Só dá para sair antes de começar.';
      s.jogadores.splice(idx, 1);
      recolorir(s);
      log(s, j.nome + ' saiu da sala.');
      return null;
    }
    if (acao.tipo === 'comecar') {
      if (idx !== 0) return 'Só o primeiro jogador começa.';
      if (s.fase !== 'sala') return null;
      if (s.jogadores.length < jogo.min) return 'Precisa de pelo menos ' + jogo.min + ' jogadores.';
      return jogo.comecar(s);
    }
    if (acao.tipo === 'voltarSala') {
      if (idx !== 0) return 'Só o primeiro jogador pode encerrar a partida.';
      var fixos = { sala: 1, jogo: 1, fase: 1, jogadores: 1, log: 1, versao: 1 };
      for (var k in s) if (!fixos[k]) delete s[k];
      s.jogadores = s.jogadores.map(function (q) { return { key: q.key, nome: q.nome }; });
      recolorir(s);
      s.fase = 'sala';
      log(s, 'Partida encerrada. Esperando para começar de novo.');
      return null;
    }
    if (s.fase === 'sala') return 'A partida ainda não começou.';
    return jogo.acao(s, idx, acao);
  }

  var API = { novoEstado: novoEstado, aplicar: aplicar, log: log, CORES: CORES };
  if (typeof module !== 'undefined') module.exports = API;
  else root.SALA_REGRAS = API;
})(this);
