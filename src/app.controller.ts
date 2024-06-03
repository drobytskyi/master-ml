import { Body, Controller, Post } from '@nestjs/common';
import { MlService } from './ml/ml.service';

@Controller('data-processing')
export class AppController {
  constructor(private readonly mlService: MlService) {}

  @Post('analyze')
  async analyze(@Body() data: any) {
    return await this.mlService.analyzeDataAndDecide(data);
  }
}
