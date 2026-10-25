# 🚂 Trilhos do Sudoeste

Jogo de trens com as cidades do **Sudoeste do Paraná** (Pato Branco, Francisco Beltrão, Dois Vizinhos, Verê, Itapejara d'Oeste, Palmas, Capanema...). O tabuleiro fica na TV ou no computador, e cada pessoa joga pelo próprio celular, com suas cartas e bilhetes em segredo.

Inspirado em jogos de rotas de trem, com mapa, regras simplificadas e arte próprios.

## Como jogar

1. Na TV (ou no computador), abra o site e clique em **Abrir o tabuleiro**. Aparece um QR code e o código da sala.
2. Cada pessoa escaneia o QR (ou abre o site no celular e digita o código), coloca o nome e entra. De 2 a 5 jogadores.
3. O primeiro a entrar aperta **COMEÇAR**. Cada um escolhe os bilhetes de destino iniciais (fica com pelo menos 2).

**Na sua vez, faça UMA destas coisas:**

- **Pegar 2 cartas**, das 5 abertas na mesa ou do monte. Coringa aberto conta como as duas.
- **Ocupar uma rota** entre duas cidades, pagando cartas da cor dela (rota cinza aceita qualquer cor; coringa vale qualquer cor). Rotas maiores valem mais: 1→1, 2→2, 3→4, 4→7, 5→10, 6→15 pontos.
- **Pegar 3 bilhetes** de destino e ficar com pelo menos 1.

Quando alguém fica com 2 vagões ou menos, todos jogam mais uma vez e acaba. Na contagem final, cada bilhete completo (cidades ligadas pelos seus trens) soma os pontos dele, cada bilhete incompleto desconta, e quem tiver o maior caminho contínuo ganha +10.

Rotas duplas só podem ser usadas as duas com 4 ou mais jogadores.

**Durante o jogo:** qualquer um troca o próprio nome em **Opções** no celular. Antes de começar, dá para **Sair da sala**. O primeiro jogador pode **Encerrar a partida e voltar para a sala** (ou **Nova partida** no fim): todo mundo continua conectado e gente nova pode entrar. No celular, um **mapinha só seu** mostra onde ficam as cidades dos seus bilhetes (ao escolher, desmarcar um bilhete tira o trajeto dele do mapinha). Na lista de rotas que dá para ocupar, a **busca por cidade** aceita parte do nome e ignora acentos ("pato", "vere").

## Como funciona por dentro

- Site estático (GitHub Pages): `index.html`, `tv.html` (tabuleiro) e `celular.html` (mão do jogador).
- A **TV é o juiz**: roda as regras (`js/regras.js`) e publica o estado. Os celulares mandam as jogadas pelo **Firebase Realtime Database**, usando a API REST e EventSource (`js/firebase.js`). Isso funciona até em navegador de TV antiga, sem SDK.
- Cada sala fica em `salas/<código>`. O estado completo também é salvo lá, então dá para recarregar a TV no meio da partida (`tv.html?sala=CODIGO`).
- Para começar uma partida nova: `tv.html?nova=1`.

## Mapa

`js/mapa.js` é gerado por `ferramentas/gerar-mapa.js` a partir da latitude/longitude real das cidades. Ele liga as cidades vizinhas sem cruzar rotas e calcula os bilhetes pelo menor caminho. Para mudar cidades ou rotas, edite a lista no gerador e rode:

```bash
node ferramentas/gerar-mapa.js
```

Para testar as regras com robôs: `node ferramentas/simular.js`. Servidor local para testes: `node ferramentas/servidor.js` (http://localhost:5500).
