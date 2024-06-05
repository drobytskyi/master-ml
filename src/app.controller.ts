import { Controller } from '@nestjs/common';
import { MlService } from './ml/ml.service';

@Controller('data-processing')
export class AppController {
  constructor(private readonly mlService: MlService) {}
}
