import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { MlController } from './ml/ml.controller';
import { MlService } from './ml/ml.service';

@Module({
  imports: [ConfigModule.forRoot(), HttpModule],
  controllers: [AppController, MlController],
  providers: [MlService],
})
export class AppModule {}
