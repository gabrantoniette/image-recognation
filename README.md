# image-recognation: Duck Hunt played by AI

[![CI](https://github.com/gabrantoniette/image-recognation/actions/workflows/ci.yml/badge.svg)](https://github.com/gabrantoniette/image-recognation/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A JavaScript/HTML5 take on the classic **Duck Hunt** where a neural network does the shooting.
The **YOLOv5n** object detection model runs **directly in the browser** with **TensorFlow.js**,
inside a **Web Worker**. It "watches" the game screen, finds the ducks, moves the crosshair onto them and fires.

Everything runs client-side. There is no backend, and no image ever leaves the browser.

## How it works

```
┌────────────── main thread ───────────────┐        ┌──────────── Web Worker ────────────┐
│ PixiJS renders the game                  │        │ TensorFlow.js + YOLOv5n            │
│                                          │ bitmap │                                    │
│ every 200 ms: capture the stage ─────────┼───────►│ resize 640×640, normalize (/255)   │
│ (renderer.extract.canvas → ImageBitmap)  │        │ inference (boxes, scores, classes) │
│                                          │        │ keep score ≥ 0.4 + target class    │
│ move crosshair, call game.handleClick() ◄┼────────┤ compute the box center             │
│ update the HUD (score / coordinates)     │  x, y  │                                    │
└──────────────────────────────────────────┘        └────────────────────────────────────┘
```

1. **Model loading** ([machine-learning/worker.js](machine-learning/worker.js)): the worker loads TensorFlow.js (pinned to 4.22.0), the labels (`labels.json`, the 80 COCO classes) and the converted model (`model.json` + `.bin` weights). It then runs a warm-up inference and notifies the main thread with `model-loaded`. If anything fails, it sends `model-error` instead.
2. **Capture** ([machine-learning/main.js](machine-learning/main.js)): once `model-loaded` arrives, the PixiJS stage is extracted as a canvas every 200 ms and converted into an `ImageBitmap`. The bitmap is **transferred** (zero-copy) to the worker.
3. **Inference**: the image is resized to 640×640 and normalized. The model, which has NMS built into the graph, returns boxes, scores and classes. Frames that arrive while an inference is still running are dropped, so no queue builds up.
4. **Post-processing**: detections scoring below `0.4` are discarded and only the target class is kept. COCO has no "duck" class, and YOLOv5n recognizes the duck sprites as `kite`. Normalized coordinates are converted to pixels, and the center of the box becomes the target.
5. **Shooting**: the main thread moves the crosshair (`Aim`) onto the target and calls `game.handleClick()`, simulating a player click.

## Stack

| Layer | Technology |
| --- | --- |
| Rendering | [PixiJS 8](https://pixijs.com/) (WebGL/Canvas) |
| Animation | GSAP |
| Audio | Howler.js (Web Audio API with HTML5 Audio fallback) |
| Object detection | YOLOv5n converted to a TF.js graph model ([machine-learning/yolov5n_web_model](machine-learning/yolov5n_web_model)) |
| Inference | [TensorFlow.js](https://www.tensorflow.org/js) in a Web Worker |
| Build | Webpack 5 + Babel |

## Project structure

```
.
├── main.js                     # entry point: creates the game and wires up the AI
├── machine-learning/
│   ├── main.js                 # screen capture, worker messaging, shooting
│   ├── worker.js               # YOLOv5n model loading and inference
│   ├── layout.js               # HUD with score and predicted coordinates
│   └── yolov5n_web_model/      # TF.js model + COCO labels
├── src/                        # Duck Hunt game (modules, levels, assets)
├── dist/                       # ready-to-serve build (committed)
└── webpack.config.js
```

## Running locally

Requirement: [Node.js](https://nodejs.org/) 20 or newer.

```bash
git clone https://github.com/gabrantoniette/image-recognation.git
cd image-recognation
npm ci
npm start          # dev server at http://localhost:8080
```

- `npm run build` writes the build to `dist/`.
- `npm run lint` runs ESLint on the game and the AI layer. CI requires it to pass.
- `dist/` is committed. To play without installing anything, serve that folder with any static server (for example, `npx serve dist`). Opening `index.html` through `file://` does not work because of CORS.
- The worker downloads TensorFlow.js from `cdn.jsdelivr.net`, so an internet connection is required.

### Controls

| Key | Action |
| --- | --- |
| `p` | pause |
| `m` | mute |
| `f` | fullscreen |
| `c` | open the level editor |

### Debugging the worker

For a `debugger` statement inside `worker.js` to pause execution, open DevTools **before** loading the page (the worker is created right at startup). Then select the worker context under *Sources → Threads*.

### Audio and image assets

- `npm run audio` rebuilds the audio sprite (requires [ffmpeg](https://ffmpeg.org/download.html)).
- `npm run images` rebuilds the spritesheet (requires [TexturePacker](https://www.codeandweb.com/texturepacker/download)).

## Contributing

Issues and pull requests are welcome. The `main` branch is protected: every change goes through a PR, and CI (lint + build) must pass. Run `npm run lint` before opening a PR.
To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Credits and license

The game is based on [DuckHunt-JS](https://github.com/MattSurabian/DuckHunt-JS) by Matt Surabian.
The AI layer (YOLOv5n + TensorFlow.js) was added in this repository.
The code in this repository is distributed under the [MIT](LICENSE) license.
The YOLOv5n model in `machine-learning/yolov5n_web_model/` comes from [Ultralytics YOLOv5](https://github.com/ultralytics/yolov5), which is licensed under **AGPL-3.0**. That license's terms apply to the model.
