// Roteiro do vídeo. Coordenadas: TV em px da tela 1600x900; celular em px CSS da página (390 de largura).
// Cada cena: tv/cel = arquivo; passos = [{d: segundos, cap, hl: [{em:'tv'|'cel', x,y,w,h}], zoom: {x,y,w,h}, rolar: y}]
window.CENAS = [
  { titulo: true, passos: [{ d: 4.5 }] },
  {
    tv: '01-menu',
    passos: [{ d: 6.5, cap: 'Na TV, abra o site Jogos do Sudoeste e escolha Safra do Sudoeste → “Abrir na TV”.', hl: [{ em: 'tv', x: 582, y: 165, w: 437, h: 487 }] }],
  },
  {
    tv: '02-tv-sala', cel: '03-cel-codigo',
    passos: [
      { d: 5, cap: 'A TV mostra o QR code e o código da sala.', hl: [{ em: 'tv', x: 325, y: 340, w: 700, h: 355 }] },
      { d: 5.5, cap: 'No celular, aponte a câmera para o QR code — ou abra o site, toque em “Entrar com o código da TV” e digite o código.', hl: [{ em: 'cel', x: 10, y: 100, w: 370, h: 140 }] },
    ],
  },
  {
    tv: '06-tv-sala-cheia', cel: '04-cel-nome',
    passos: [{ d: 6, cap: 'Cada um digita o nome e toca em “Entrar na partida”. Joga de 2 a 4 pessoas.', hl: [{ em: 'cel', x: 10, y: 95, w: 370, h: 145 }, { em: 'tv', x: 712, y: 555, w: 330, h: 120 }] }],
  },
  {
    tv: '06-tv-sala-cheia', cel: '05-cel-sala',
    passos: [{ d: 5, cap: 'Quando todos entrarem, o primeiro jogador toca em COMEÇAR.', hl: [{ em: 'cel', x: 10, y: 434, w: 370, h: 66 }] }],
  },
  {
    tv: '07-tv-inicio',
    passos: [
      { d: 4.5, cap: 'Esta é a mesa. Ela fica na TV, para todo mundo ver.' },
      { d: 6, cap: 'No meio ficam os negócios à venda, em 3 níveis: o nível I é barato; o III é caro, mas vale mais pontos.', zoom: { x: 260, y: 70, w: 1025, h: 590 }, hl: [{ em: 'tv', x: 268, y: 73, w: 1008, h: 584 }] },
      { d: 7, cap: 'Cada negócio mostra os pontos (número grande), o produto que ele dá de desconto (bolinha no canto) e o custo (embaixo).', zoom: { x: 430, y: 265, w: 430, h: 200 }, hl: [{ em: 'tv', x: 437, y: 271, w: 203, h: 190 }] },
      { d: 6, cap: 'À direita, os produtos que ainda tem na mesa. O 💰 crédito é coringa: vale qualquer produto.', hl: [{ em: 'tv', x: 1335, y: 75, w: 260, h: 520 }] },
      { d: 6.5, cap: 'À esquerda, as feiras das cidades: cada uma vale 3 pontos e pede uma quantidade de negócios de cada tipo.', hl: [{ em: 'tv', x: 18, y: 75, w: 225, h: 480 }] },
      { d: 5.5, cap: 'Embaixo, cada jogador: pontos, descontos e as fichas que tem na mão.', hl: [{ em: 'tv', x: 15, y: 685, w: 1570, h: 205 }] },
    ],
  },
  {
    cel: '08-cel-vez',
    passos: [
      { d: 5, cap: 'Na sua vez, o celular avisa: “Sua vez! Escolha UMA ação”.', hl: [{ em: 'cel', x: 10, y: 64, w: 370, h: 58 }] },
      { d: 6.5, cap: 'Em cima fica a sua mão: o número na bolinha são as fichas; o +N embaixo é o desconto que você já tem.', hl: [{ em: 'cel', x: 10, y: 128, w: 370, h: 140 }] },
    ],
  },
  {
    tv: '11-tv-depois-pegar', cel: '10-cel-selecao',
    passos: [
      { d: 6.5, rolar: 200, cap: 'AÇÃO 1 · Pegar produtos: toque em 3 produtos diferentes e depois em “Pegar”.', hl: [{ em: 'cel', x: 10, y: 334, w: 370, h: 60 }, { em: 'cel', x: 10, y: 482, w: 370, h: 66 }] },
      { d: 5, rolar: 200, cap: 'A jogada aparece na TV na hora, e a vez passa para o próximo.', hl: [{ em: 'tv', x: 18, y: 688, w: 515, h: 200 }] },
    ],
  },
  {
    tv: '11-tv-depois-pegar', cel: '13-cel-dois-iguais',
    passos: [{ d: 6.5, rolar: 200, cap: '…ou toque 2 vezes no mesmo produto para pegar 2 iguais (só se a mesa tiver 4 ou mais dele).', hl: [{ em: 'cel', x: 10, y: 334, w: 370, h: 60 }, { em: 'cel', x: 10, y: 482, w: 370, h: 66 }] }],
  },
  {
    tv: '15-tv-reservou', cel: '14-cel-reservou',
    passos: [
      { d: 7, rolar: 120, cap: 'AÇÃO 2 · Reservar: guarda um negócio só para você (os outros não veem qual) e ganha 1 💰 coringa.', hl: [{ em: 'cel', x: 10, y: 556, w: 370, h: 190 }] },
      { d: 6, rolar: 0, cap: 'O coringa vale qualquer produto na hora de comprar. Dá para ter até 3 reservados.', hl: [{ em: 'cel', x: 10, y: 158, w: 370, h: 80 }] },
    ],
  },
  {
    tv: '17-tv-comprou', cel: '16-cel-pode-comprar',
    passos: [
      { d: 3.5, rolar: 520, cap: 'AÇÃO 3 · Comprar: cada negócio mostra quanto falta…' },
      { d: 6.5, rolar: 1560, cap: '…e quando aparece “Dá para comprar!”, é só tocar em Comprar. O celular já faz a conta.', hl: [{ em: 'cel', x: 10, y: 1857, w: 370, h: 152 }] },
    ],
  },
  {
    tv: '17-tv-comprou', cel: '18-cel-comprou',
    passos: [{ d: 7, rolar: 0, cap: 'O negócio comprado vira desconto para sempre: agora a Ana tem +1 de soja em toda compra.', hl: [{ em: 'cel', x: 10, y: 158, w: 370, h: 80 }, { em: 'tv', x: 30, y: 778, w: 290, h: 42 }] }],
  },
  {
    tv: '21-tv-meio', cel: '20-cel-meio',
    passos: [
      { d: 6, rolar: 0, cap: 'Os descontos vão crescendo. No meio do jogo, a Ana já tem +4 de erva-mate…', hl: [{ em: 'cel', x: 10, y: 158, w: 370, h: 80 }] },
      { d: 6.5, rolar: 1560, cap: '…então a Roça de soja, que custa 4 erva-mate, sai de graça! Por isso vale começar pelos negócios baratos.', hl: [{ em: 'cel', x: 10, y: 1857, w: 370, h: 160 }] },
    ],
  },
  {
    tv: '19-tv-feira',
    passos: [{ d: 7.5, cap: 'Feiras: quando alguém junta os negócios que uma feira pede, ela visita sozinha (+3 pontos). Aqui a feira visitou a Carla.', hl: [{ em: 'tv', x: 1070, y: 690, w: 510, h: 195 }, { em: 'tv', x: 18, y: 75, w: 225, h: 370 }] }],
  },
  {
    tv: '22-tv-ultima',
    passos: [
      { d: 5, cap: 'Quando alguém chega a 15 pontos, começa a ÚLTIMA RODADA…', hl: [{ em: 'tv', x: 670, y: 12, w: 260, h: 50 }, { em: 'tv', x: 450, y: 700, w: 75, h: 55 }] },
      { d: 5.5, cap: '…que vai até o fim da volta, para todos jogarem o mesmo número de vezes.' },
    ],
  },
  {
    tv: '24-tv-fim',
    passos: [{ d: 7.5, cap: 'Ganha quem tiver mais pontos (no empate, quem tem menos negócios). A Ana chegou a 15 primeiro, mas a Carla virou na última rodada!', hl: [{ em: 'tv', x: 568, y: 528, w: 464, h: 56 }] }],
  },
  { resumo: true, passos: [{ d: 10 }] },
];
