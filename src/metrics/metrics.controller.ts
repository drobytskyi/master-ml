// src/metrics/metrics.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post()
  async addMetric(@Body() createMetricDto: any) {
    return this.metricsService.create(createMetricDto);
  }
}
