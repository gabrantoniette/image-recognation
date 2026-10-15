importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest');

const MODEL_PATH = `yolov5n_web_model/model.json`;
const LABELS_PATH = `yolov5n_web_model/labels.json`;
const DIMENSIONS = 640
const CLASS_THRESHOLD = 0.4

let _labels = {}
let _model = null

async function loadModelLabel() {
    await tf.ready()

    const response = await fetch(LABELS_PATH)
    if (!response.ok) {
        throw new Error(`Failed to load labels from ${LABELS_PATH}`);
    }
    _labels = await response.json()
    _model = await tf.loadGraphModel(MODEL_PATH)

    const modelInputShape = tf.ones(_model.inputs[0].shape)
    await _model.executeAsync(modelInputShape)
    tf.dispose(modelInputShape)

    postMessage({
        type: 'model-loaded'
    })
}


function preporcessImage(image) {
    return tf.tidy(() => {
        const tensor = tf.browser.fromPixels(image)

        return tf.image
        .resizeBilinear(tensor, [DIMENSIONS, DIMENSIONS])
        .div(255)
        .expandDims(0)
    })
}


async function runInference(input) {
    const output = await _model.executeAsync(input)

    tf.dispose(input)
    
    const [boxes, scores, classes]  = output.slice(0, 3)
    const [boxesData, scoresData, classesData] = await Promise.all([
        boxes.data(),
        scores.data(),
        classes.data(),
    ])

    output.forEach(t => t.dispose())

    return {
        boxes: boxesData,
        scores: scoresData,
        classes: classesData
    }

}


function * processPredicton({ boxes, scores, classes }, width, height) {
    for (let index = 0; index < scores.length; index++) {
        if (scores[index] < CLASS_THRESHOLD) continue

        const label =  _labels[classes[index]] 
        if(label !== 'kite') continue

        let [ymin, xmin, ymax, xmax] = boxes.slice(index * 4, (index + 1)* 4)
        xmin *= width
        xmax *= width
        ymin *= height
        ymax *= height

        const boxWidth = xmax - xmin
        const boxHeight = ymax - ymin
        const centerX = xmin + boxWidth / 2
        const centerY = ymin + boxHeight / 2

        yield {
            x: centerX,
            y: centerY,
            score: (scores[index]*100).toFixed(2)
        }

    }
}


loadModelLabel() 


self.onmessage = async ({ data }) => {
    if (data.type !== 'predict') return
    if (!_model) return

    const input = preporcessImage(data.image)
    const {width, height} = data.image
    
    const inferenceResults = await runInference(input)

    for (const prediction of processPredicton(inferenceResults, width, height)) {
        console.log('Prediction:', prediction)

        postMessage({
            type: 'prediction',
            ...prediction
        });
    }
};

console.log('🧠 YOLOv5n Web Worker initialized');
