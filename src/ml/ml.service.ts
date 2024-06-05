import { Injectable } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';
import { createModel } from './ml.model';
import { Metric, ResourceDecision } from './ml.types';

@Injectable()
export class MlService {
  private model: tf.LayersModel | null = null;
  private trainingData: {
    InstanceId: string;
    Metrics: { CPUUtilization: Metric[]; MemoryUsage: Metric[] };
  };

  async trainModel(data: {
    InstanceId: string;
    Metrics: { CPUUtilization: Metric[]; MemoryUsage: Metric[] };
  }) {
    this.trainingData = data;
    this.model = await createModel();
    const { xs, ys } = this.prepareTrainingData(data);
    await this.model.fit(xs, ys, { epochs: 2000 });
    console.log('Model training complete');
  }

  async predict(time: string): Promise<ResourceDecision> {
    if (!this.model) throw new Error('Model not trained yet');

    const { hour, minute } = this.parseTime(time);
    const pastDataPoint = this.findClosestPastData(hour, minute);

    const inputTensor = tf.tensor2d([
      [pastDataPoint.CPUUtilization, pastDataPoint.MemoryUsage],
    ]);
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const predictionData = prediction.dataSync();
    tf.dispose([inputTensor, prediction]);

    const scaleUpThreshold = 0.7;
    const scaleDownThreshold = 0.3;

    let action: 'Scale Up' | 'Scale Down' | 'No Action' = 'No Action';
    let reason;

    if (predictionData[0] > scaleUpThreshold) {
      action = 'Scale Up';
      reason =
        pastDataPoint.CPUUtilization > pastDataPoint.MemoryUsage
          ? 'CPU almost 90%'
          : 'Memory almost 90%';
    } else if (predictionData[1] > scaleDownThreshold) {
      action = 'Scale Down';
    }

    return {
      action,
      resources:
        action !== 'No Action'
          ? { instanceType: action === 'Scale Up' ? 't2.large' : 't2.small' }
          : undefined,
      time,
      reason,
    };
  }

  private parseTime(timeStr: string) {
    const [hourStr, minuteStr] = timeStr.split(':');
    return { hour: parseInt(hourStr, 10), minute: parseInt(minuteStr, 10) };
  }

  private findClosestPastData(hour: number, minute: number) {
    const targetTimeMinutes = hour * 60 + minute;
    let closestTimeDiff = Infinity;
    let closestDataPoint = null;

    for (let i = 0; i < this.trainingData.Metrics.CPUUtilization.length; i++) {
      const entryTime = new Date(
        this.trainingData.Metrics.CPUUtilization[i].Timestamp,
      );
      const entryTimeMinutes =
        entryTime.getHours() * 60 + entryTime.getMinutes();
      const timeDiff = Math.abs(targetTimeMinutes - entryTimeMinutes);

      if (timeDiff < closestTimeDiff) {
        closestTimeDiff = timeDiff;
        closestDataPoint = {
          CPUUtilization: this.trainingData.Metrics.CPUUtilization[i].Average,
          MemoryUsage: this.trainingData.Metrics.MemoryUsage[i].Average,
        };
      }
    }

    return closestDataPoint;
  }
  private prepareTrainingData(data: any): { xs: tf.Tensor2D; ys: tf.Tensor2D } {
    const cpuUtilization = data.Metrics.CPUUtilization.map(
      (entry: Metric) => entry.Average,
    );
    const memoryUsage = data.Metrics.MemoryUsage.map(
      (entry: Metric) => entry.Average,
    );

    const xs = tf.tensor2d(
      cpuUtilization.map((cpu: number, index: number) => [
        cpu,
        memoryUsage[index],
      ]),
    );

    // Use a higher threshold for scaling up (e.g., 80%) and a lower one for scaling down (e.g., 20%)
    const ys = tf.tensor2d(
      cpuUtilization.map((cpu: number, index: number) => {
        if (cpu > 80 || memoryUsage[index] > 80) {
          return [1, 0]; // Scale Up
        } else if (cpu < 20 && memoryUsage[index] < 20) {
          return [0, 1]; // Scale Down
        } else {
          return [0, 0]; // No Action (you may need to adjust your model to handle this)
        }
      }),
    );

    return { xs, ys };
  }
}
