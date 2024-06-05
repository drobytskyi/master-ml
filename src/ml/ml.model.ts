import * as tf from '@tensorflow/tfjs-node';

export async function createModel() {
  const model = tf.sequential();
  model.add(
    tf.layers.dense({ units: 10, activation: 'relu', inputShape: [2] }),
  );
  model.add(tf.layers.dense({ units: 2, activation: 'softmax' }));
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });
  return model;
}
