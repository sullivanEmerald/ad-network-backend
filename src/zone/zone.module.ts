import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviveModule } from '../revive/revive.module';
import { Publisher, PublisherSchema } from '../publishers/schemas/publisher.schema';
import { ZoneController } from './zone.controller';
import { ZoneService } from './zone.service';
import { Zone, ZoneSchema } from './schema/zone.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Zone.name, schema: ZoneSchema },
      { name: Publisher.name, schema: PublisherSchema },
    ]),
    ReviveModule,
  ],
  controllers: [ZoneController],
  providers: [ZoneService],
  exports: [ZoneService]
})
export class ZoneModule { }
