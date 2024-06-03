// src/prediction/prediction.service.ts
import { Injectable } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';

@Injectable()
export class PredictionService {
  private model: tf.LayersModel;

  constructor() {
    this.loadModel();
  }

  async loadModel() {
    this.model = await tf.loadLayersModel('file://path/to/your/model.json');
  }

  async predict(metrics) {
    const inputTensor = tf.tensor(metrics);
    const prediction = this.model.predict(inputTensor);
    return prediction;
  }
}
