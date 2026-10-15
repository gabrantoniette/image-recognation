// Pinned version: `@latest` could change behavior without notice.
importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');

const MODEL_PATH = 'yolov5n_web_model/model.json';
const LABELS_PATH = 'yolov5n_web_model/labels.json';
const DIMENSIONS = 640;
const CLASS_THRESHOLD = 0.4;
// COCO has no "duck" class; YOLOv5n detects the duck sprites as "kite"
const TARGET_LABEL = 'kite';

let _labels = [];
let _model = null;
let _busy = false;

async function loadModelLabel() {
  await tf.ready();

  const response = await fetch(LABELS_PATH);
  if (!response.ok) {
    throw new Error(`Failed to load labels from ${LABELS_PATH}`);
  }
  _labels = await response.json();
  _model = await tf.loadGraphModel(MODEL_PATH);

  // Warm-up run so the first real prediction isn't slow
  const dummyInput = tf.ones(_model.inputs[0].shape);
  const warmupOutput = await _model.executeAsync(dummyInput);
  tf.dispose([dummyInput, warmupOutput]);

  postMessage({
    type: 'model-loaded'
  });
}

function preprocessImage(image) {
  return tf.tidy(() => {
    const tensor = tf.browser.fromPixels(image);

    return tf.image
      .resizeBilinear(tensor, [DIMENSIONS, DIMENSIONS])
      .div(255)
      .expandDims(0);
  });
}

async function runInference(input) {
  const output = await _model.executeAsync(input);

  tf.dispose(input);

  const [boxes, scores, classes] = output.slice(0, 3);
  const [boxesData, scoresData, classesData] = await Promise.all([
    boxes.data(),
    scores.data(),
    classes.data(),
  ]);

  tf.dispose(output);

  return {
    boxes: boxesData,
    scores: scoresData,
    classes: classesData
  };
}

function *processPrediction({ boxes, scores, classes }, width, height) {
  for (let index = 0; index < scores.length; index++) {
    if (scores[index] < CLASS_THRESHOLD) continue;

    const label = _labels[classes[index]];
    if (label !== TARGET_LABEL) continue;

    let [ymin, xmin, ymax, xmax] = boxes.slice(index * 4, (index + 1) * 4);
    xmin *= width;
    xmax *= width;
    ymin *= height;
    ymax *= height;

    const boxWidth = xmax - xmin;
    const boxHeight = ymax - ymin;
    const centerX = xmin + boxWidth / 2;
    const centerY = ymin + boxHeight / 2;

    yield {
      x: centerX,
      y: centerY,
      score: (scores[index] * 100).toFixed(2)
    };
  }
}

loadModelLabel().catch((error) => {
  console.error('Failed to load YOLOv5n model:', error);
  postMessage({
    type: 'model-error',
    message: error.message
  });
});

self.onmessage = async({ data }) => {
  if (data.type !== 'predict') return;

  const image = data.image;

  // Drop frames while the model is loading or a previous inference is still running
  if (!_model || _busy) {
    image.close();
    return;
  }

  _busy = true;
  try {
    const { width, height } = image;
    const input = preprocessImage(image);
    const inferenceResults = await runInference(input);

    for (const prediction of processPrediction(inferenceResults, width, height)) {
      postMessage({
        type: 'prediction',
        ...prediction
      });
    }
  } catch (error) {
    console.error('Inference failed:', error);
  } finally {
    image.close();
    _busy = false;
  }
};

console.log('🧠 YOLOv5n Web Worker initialized');
