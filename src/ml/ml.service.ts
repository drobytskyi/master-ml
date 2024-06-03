import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tf from '@tensorflow/tfjs-node';

@Injectable()
export class MlService {
  private readonly hubServerUrl: string;
  private readonly instanceId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.hubServerUrl = this.configService.get<string>('HUB_SERVER_URL');
    this.instanceId = this.configService.get<string>('INSTANCE_ID');
  }

  async analyzeDataAndDecide(data: any): Promise<any> {
    // Train the model with the provided data
    await this.trainModel(data);

    const decision = await this.makeDecision(data);
    console.log('🚀 ~ MlService ~ analyzeDataAndDecide ~ decision:', decision);

    if (decision.scaleUp) {
      return decision;
      //   await lastValueFrom(
      //     this.httpService.post(
      //       `${this.hubServerUrl}/resource-management/scale-up`,
      //       {
      //         instanceId: this.instanceId,
      //         resources: decision.resources,
      //       },
      //     ),
      //   );
    } else if (decision.scaleDown) {
      return decision;

      //   await lastValueFrom(
      //     this.httpService.post(
      //       `${this.hubServerUrl}/resource-management/scale-down`,
      //       {
      //         instanceId: this.instanceId,
      //         resources: decision.resources,
      //       },
      //     ),
      //   );
    }
  }

  private async trainModel(data: any): Promise<void> {
    const { xs, ys } = this.prepareTrainingData(data);

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

    await model.fit(xs, ys, {
      epochs: 2000,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs.loss}`);
        },
      },
    });

    await model.save('file://./model');
  }

  private async makeDecision(data: any): Promise<{
    scaleUp: boolean;
    scaleDown: boolean;
    resources: any;
    times: number[];
  }> {
    console.log('🚀 ~ MlService ~ makeDecision-1');

    const model = await this.loadModel();
    const inputTensor = this.prepareInput(data);

    console.log('🚀 ~ MlService ~ makeDecision');
    const prediction = model.predict(inputTensor) as tf.Tensor;
    const predictionData = prediction.dataSync();
    const scaleUp = predictionData[0] > 0.5;
    const scaleDown = predictionData[1] > 0.5;

    tf.dispose([inputTensor, prediction]);
    console.log('🚀 ~ MlService ~ makeDecision');
    console.log('🚀 ~ MlService ~ scaleDown:', scaleDown);
    console.log('🚀 ~ MlService ~ scaleUp:', scaleUp);

    const times = this.getHighUtilizationTimes(data);

    if (scaleUp) {
      console.log('scale up');
      return {
        scaleUp: true,
        scaleDown: false,
        resources: { instanceType: 't2.large' },
        times,
      };
    } else if (scaleDown) {
      console.log('scale down');
      return {
        scaleUp: false,
        scaleDown: true,
        resources: { instanceType: 't2.small' },
        times,
      };
    }
    console.log('🚀 ~ MlService ~ makeDecision-2');

    return { scaleUp: false, scaleDown: false, resources: null, times };
  }

  private getHighUtilizationTimes(data: any): number[] {
    const cpuUtilization = data.Metrics.CPUUtilization;
    const highUtilizationTimes = cpuUtilization
      .filter((entry: any) => entry.Average > 70)
      .map((entry: any) => entry.Timestamp);
    return highUtilizationTimes;
  }

  private prepareTrainingData(data: any) {
    const cpuUtilization = data.Metrics.CPUUtilization.map(
      (entry: any) => entry.Average,
    );
    const memoryUsage = data.Metrics.MemoryUsage.map(
      (entry: any) => entry.Average,
    );

    const xs = tf.tensor2d(
      cpuUtilization.map((cpu: number, index: number) => [
        cpu,
        memoryUsage[index],
      ]),
    );
    const ys = tf.tensor2d(
      cpuUtilization.map((cpu: number) => (cpu > 70 ? [1, 0] : [0, 1])),
    );

    return { xs, ys };
  }

  private async loadModel(): Promise<tf.LayersModel> {
    return await tf.loadLayersModel('file://./model/model.json');
  }

  private prepareInput(data: any): tf.Tensor {
    const cpuAverage =
      data.Metrics.CPUUtilization.reduce(
        (sum: number, entry: any) => sum + entry.Average,
        0,
      ) / data.Metrics.CPUUtilization.length;
    const memoryAverage =
      data.Metrics.MemoryUsage.reduce(
        (sum: number, entry: any) => sum + entry.Average,
        0,
      ) / data.Metrics.MemoryUsage.length;

    return tf.tensor2d([[cpuAverage, memoryAverage]]);
  }
}
