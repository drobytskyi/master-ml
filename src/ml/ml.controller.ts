import { Body, Controller, Post } from '@nestjs/common';
import { MlService } from './ml.service';
import { ResourceDecision } from './ml.types';

@Controller('ml')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  @Post('train')
  train(@Body() data: any): Promise<void> {
    // You can define a more specific type for data
    return this.mlService.trainModel(data);
  }

  @Post('predict')
  predict(@Body() request: { time: string }): Promise<ResourceDecision> {
    return this.mlService.predict(request.time);
  }
}
