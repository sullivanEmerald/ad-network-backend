import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublishersController } from './publishers.controller';
import { PublishersService } from './publishers.service';
import { Publisher, PublisherSchema, } from './schemas/publisher.schema';
import { ReviveModule } from '../revive/revive.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Publisher.name, schema: PublisherSchema, },]),
    ReviveModule,
  ],
  controllers: [PublishersController],
  providers: [PublishersService]
})
export class PublishersModule { }
