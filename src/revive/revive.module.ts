import { Module } from '@nestjs/common';
import { ReviveService } from './revive.service';

@Module({
  providers: [ReviveService]
})
export class ReviveModule {}
