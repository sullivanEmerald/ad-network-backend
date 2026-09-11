import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReviveApiService } from './revive-api.service';

@Module({
  imports: [ConfigModule],
  providers: [ReviveApiService],
  exports: [ReviveApiService],
})
export class AdServerModule { }
