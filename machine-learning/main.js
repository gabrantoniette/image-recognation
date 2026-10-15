import { buildLayout } from './layout';

const CAPTURE_INTERVAL_MS = 200;

export default async function main(game) {
  const container = buildLayout(game.app);
  // Classic worker (no `type: 'module'`): worker.js relies on importScripts
  const worker = new Worker(new URL('./worker.js', import.meta.url));

  game.stage.aim.visible = false;

  function startCapture() {
    setInterval(async() => {
      const canvas = game.app.renderer.extract.canvas(game.stage);
      const bitmap = await createImageBitmap(canvas);

      worker.postMessage({
        type: 'predict',
        image: bitmap,
      }, [bitmap]);
    }, CAPTURE_INTERVAL_MS);
  }

  worker.onmessage = ({ data }) => {
    const { type, x, y } = data;

    if (type === 'model-loaded') {
      console.log('✅ YOLOv5n model loaded');
      startCapture();
      return;
    }

    if (type === 'model-error') {
      console.error(`❌ Could not load the model: ${data.message}`);
      return;
    }

    if (type === 'prediction') {
      console.log(`🎯 AI predicted at: (${x}, ${y})`);
      container.updateHUD(data);
      game.stage.aim.visible = true;

      game.stage.aim.setPosition(x, y);
      const position = game.stage.aim.getGlobalPosition();

      game.handleClick({
        global: position,
      });
    }
  };

  return container;
}
