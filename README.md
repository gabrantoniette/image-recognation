# image-recognation — Duck Hunt jogado por IA

[![CI](https://github.com/gabrantoniette/image-recognation/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrantoniette/image-recognation/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Uma versão do clássico **Duck Hunt** em JavaScript/HTML5 em que quem atira é uma rede neural.
O modelo de detecção de objetos **YOLOv5n** roda **direto no navegador** com **TensorFlow.js**,
dentro de um **Web Worker**: ele "assiste" à tela do jogo, encontra os patos, move a mira até eles e dispara.

Tudo acontece no cliente. Não há backend, e nenhuma imagem sai do navegador.

## Como funciona

```
┌──────────── thread principal ────────────┐        ┌──────────── Web Worker ────────────┐
│ PixiJS renderiza o jogo                  │        │ TensorFlow.js + YOLOv5n            │
│                                          │ bitmap │                                    │
│ a cada 200 ms: captura o stage ──────────┼───────►│ resize 640×640, normaliza (/255)   │
│ (renderer.extract.canvas → ImageBitmap)  │        │ inferência (boxes, scores, classes)│
│                                          │        │ filtra score ≥ 0.4 e a classe alvo │
│ move a mira e chama game.handleClick() ◄─┼────────┤ calcula o centro da caixa          │
│ atualiza o HUD (score / coordenadas)     │  x, y  │                                    │
└──────────────────────────────────────────┘        └────────────────────────────────────┘
```

1. **Captura** ([machine-learning/main.js](machine-learning/main.js)): a cada 200 ms o stage do PixiJS é extraído como canvas e convertido em `ImageBitmap`. O bitmap é **transferido** (sem cópia) para o worker.
2. **Carregamento do modelo** ([machine-learning/worker.js](machine-learning/worker.js)): o worker carrega o TensorFlow.js, os rótulos (`labels.json`, as 80 classes do COCO) e o modelo convertido (`model.json` + pesos `.bin`). Em seguida faz uma inferência de aquecimento e avisa a thread principal com `model-loaded`.
3. **Inferência**: a imagem é redimensionada para 640×640 e normalizada. O modelo, que já inclui NMS no grafo, devolve caixas, scores e classes.
4. **Pós-processamento**: descarta detecções com score abaixo de `0.4` e mantém só a classe alvo. O COCO não tem a classe "pato", e o YOLOv5n reconhece os sprites dos patos como `kite`. As coordenadas normalizadas são convertidas para pixels, e o centro da caixa vira o alvo.
5. **Disparo**: a thread principal posiciona a mira (`Aim`) no alvo e chama `game.handleClick()`, simulando um clique do jogador.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Renderização | [PixiJS 8](https://pixijs.com/) (WebGL/Canvas) |
| Animações | GSAP |
| Áudio | Howler.js (Web Audio API com fallback para HTML5 Audio) |
| Detecção de objetos | YOLOv5n convertido para TF.js graph model ([machine-learning/yolov5n_web_model](machine-learning/yolov5n_web_model)) |
| Inferência | [TensorFlow.js](https://www.tensorflow.org/js) em Web Worker |
| Build | Webpack 5 + Babel |

## Estrutura

```
.
├── main.js                     # entrada: cria o jogo e liga a IA
├── machine-learning/
│   ├── main.js                 # captura de tela, comunicação com o worker, disparo
│   ├── worker.js               # carregamento do modelo e inferência YOLOv5n
│   ├── layout.js               # HUD com score e coordenadas previstas
│   └── yolov5n_web_model/      # modelo TF.js + labels COCO
├── src/                        # jogo Duck Hunt (módulos, níveis, assets)
├── dist/                       # build pronto para servir (commitado)
└── webpack.config.js
```

## Rodando localmente

Pré-requisito: [Node.js](https://nodejs.org/) 20 ou superior.

```bash
git clone https://github.com/gabrantoniette/image-recognation.git
cd image-recognation
npm ci
npm start          # servidor de desenvolvimento em http://localhost:8080
```

- `npm run build` gera o build em `dist/`.
- O `dist/` já vem commitado. Para jogar sem instalar nada, sirva essa pasta com qualquer servidor estático (por exemplo, `npx serve dist`). Abrir o `index.html` via `file://` não funciona por causa de CORS.
- O worker baixa o TensorFlow.js de `cdn.jsdelivr.net`, então é preciso estar conectado à internet.

### Controles

| Tecla | Ação |
| --- | --- |
| `p` | pausar |
| `m` | mudo |
| `f` | tela cheia |
| `c` | abrir o editor de níveis |

### Depurando o worker

Para que um `debugger` dentro de `worker.js` pause a execução, abra o DevTools **antes** de carregar a página (o worker é criado logo no início). Depois, selecione o contexto do worker em *Sources → Threads*.

### Assets de áudio e imagem

- `npm run audio` reconstrói o sprite de áudio (requer [ffmpeg](https://ffmpeg.org/download.html)).
- `npm run images` reconstrói o spritesheet (requer [TexturePacker](https://www.codeandweb.com/texturepacker/download)).

## Contribuindo

Issues e pull requests são bem-vindos. A branch `main` é protegida: toda mudança entra por PR, e o build do CI precisa passar.
Para reportar vulnerabilidades, veja a [SECURITY.md](SECURITY.md).

## Créditos e licença

O jogo é baseado no [DuckHunt-JS](https://github.com/MattSurabian/DuckHunt-JS), de Matt Surabian.
A camada de IA (YOLOv5n + TensorFlow.js) foi adicionada neste repositório.
O código deste repositório é distribuído sob a licença [MIT](LICENSE).
O modelo YOLOv5n em `machine-learning/yolov5n_web_model/` vem do [YOLOv5 da Ultralytics](https://github.com/ultralytics/yolov5), que é licenciado sob **AGPL-3.0**. Os termos dessa licença se aplicam ao modelo.
