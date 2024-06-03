// src/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private metrics = [];

  create(metric) {
    this.metrics.push(metric);
    // Тут можна додати збереження в базу даних
    return metric;
  }

  findAll() {
    return this.metrics;
  }
}
