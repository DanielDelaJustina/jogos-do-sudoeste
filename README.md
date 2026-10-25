# 🎲 Jogos do Sudoeste

Jogos de tabuleiro com a cara do **Sudoeste do Paraná**. A mesa fica na TV (ou no computador) e cada pessoa joga pelo próprio celular.

**Site:** https://danieldelajustina.github.io/jogos-do-sudoeste/ (o menu principal; abra na TV e escolha o jogo).

| Jogo | Jogadores | Ideia |
| --- | --- | --- |
| 🚂 **Trilhos do Sudoeste** | 2 a 5 | Ligue as cidades da região com trens e cumpra bilhetes secretos. |
| 🌽 **Safra do Sudoeste** | 2 a 4 | Junte leite, milho, soja, suíno e erva-mate, abra negócios que dão desconto e receba as feiras. |
| 🧭 **Expedição Sudoeste** | 1 a 5 | Todos recebem a mesma peça: monte sua trilha e leve os tropeiros aos destinos. |

Em todos: a TV mostra um QR code e o código da sala. Cada um entra pelo celular (QR ou **Entrar com o código** no menu), coloca o nome, e o primeiro a entrar aperta **COMEÇAR**. O primeiro jogador também pode encerrar a partida ou começar outra.

Adaptações livres de jogos de tabuleiro, com regras simplificadas e arte próprias.

## 🌽 Safra do Sudoeste

Na sua vez, **uma** ação:

- **Pegar produtos:** 3 diferentes, ou 2 iguais (se a pilha tiver 4 ou mais).
- **Reservar** um negócio da mesa ou do monte (fica em segredo no seu celular) e ganhar 1 **crédito**, que vale qualquer produto. Máximo 3 reservados.
- **Comprar** um negócio da mesa ou reservado. Cada negócio que você tem dá **desconto permanente** de 1 no produto dele.

Limite de 10 fichas na mão. As **feiras** das cidades visitam sozinhas quem tiver os negócios pedidos (+3). Quem chegar a **15 pontos** fecha a rodada; ganha quem tiver mais pontos (empate: menos negócios).

## 🧭 Expedição Sudoeste

A TV sorteia uma peça de trilha por rodada, **a mesma para todos**, e todos jogam ao mesmo tempo. Com a peça, cada um escolhe:

- **Colocar** no seu tabuleiro de 6x5, igual ao original (em qualquer casa vazia; dá para girar), OU
- **Descartar** e andar com os tropeiros: tantos passos quantas saídas a peça tem (2, 3 ou 4).

Cada um dos 4 tropeiros sai da borda e precisa chegar à casinha da mesma cor. Quem chega primeiro em cada destino ganha mais (6, 5, 4...). Pinhão vale 2 e erva-mate 1 para quem passar pela casa. Acaba quando alguém leva os 4 tropeiros (a rodada se completa) ou quando as 36 peças acabam.

## 🚂 Trilhos do Sudoeste

Jogo de trens com as cidades da região (Pato Branco, Francisco Beltrão, Dois Vizinhos, Verê, Itapejara d'Oeste, Palmas, Capanema...).

**Na sua vez, faça UMA destas coisas:**

- **Pegar 2 cartas**, das 5 abertas na mesa ou do monte. Coringa aberto conta como as duas.
- **Ocupar uma rota** entre duas cidades, pagando cartas da cor dela (rota cinza aceita qualquer cor; coringa vale qualquer cor). Rotas maiores valem mais: 1→1, 2→2, 3→4, 4→7, 5→10, 6→15 pontos.
- **Pegar 3 bilhetes** de destino e ficar com pelo menos 1.

Quando alguém fica com 2 vagões ou menos, todos jogam mais uma vez e acaba. Na contagem final, cada bilhete completo (cidades ligadas pelos seus trens) soma os pontos dele, cada bilhete incompleto desconta, e quem tiver o maior caminho contínuo ganha +10.

Rotas duplas só podem ser usadas as duas com 4 ou mais jogadores.

**Durante o jogo:** qualquer um troca o próprio nome em **Opções** no celular. Antes de começar, dá para **Sair da sala**. O primeiro jogador pode **Encerrar a partida e voltar para a sala** (ou **Nova partida** no fim): todo mundo continua conectado e gente nova pode entrar. No celular, um **mapinha só seu** mostra onde ficam as cidades dos seus bilhetes (ao escolher, desmarcar um bilhete tira o trajeto dele do mapinha). Na lista de rotas que dá para ocupar, a **busca por cidade** aceita parte do nome e ignora acentos ("pato", "vere").

## Como funciona por dentro

- Site estático (GitHub Pages). `index.html` é o menu; `entrar.html` recebe o código da sala e manda para o celular do jogo certo.
- Trilhos: `tv.html`, `celular.html`, `js/regras.js`. Safra e Expedição: pastas `safra/` e `expedicao/` (cada uma com `tv.html`, `celular.html` e `regras.js`), usando a sala comum de `js/sala.js` e `js/sala-regras.js`.
- A **TV é o juiz**: roda as regras e publica o estado. Os celulares mandam as jogadas pelo **Firebase Realtime Database**, usando a API REST e EventSource (`js/firebase.js`). Isso funciona até em navegador de TV antiga, sem SDK.
- Cada sala fica em `salas/<código>`. O estado completo também é salvo lá, então dá para recarregar a TV no meio da partida (`tv.html?sala=CODIGO`).
- Para começar uma partida nova: `tv.html?nova=1` (ou `safra/tv.html?nova=1`, `expedicao/tv.html?nova=1`).

## Mapa

`js/mapa.js` é gerado por `ferramentas/gerar-mapa.js` a partir da latitude/longitude real das cidades. Ele liga as cidades vizinhas sem cruzar rotas e calcula os bilhetes pelo menor caminho. Para mudar cidades ou rotas, edite a lista no gerador e rode:

```bash
node ferramentas/gerar-mapa.js
```

Para testar as regras com robôs: `node ferramentas/simular.js`, `node ferramentas/simular-safra.js` e `node ferramentas/simular-expedicao.js`. Servidor local para testes: `node ferramentas/servidor.js` (http://localhost:5500).
