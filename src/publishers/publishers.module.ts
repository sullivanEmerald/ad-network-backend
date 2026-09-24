import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PublishersController } from './publishers.controller';
import { PublishersService } from './publishers.service';
import { Publisher, PublisherSchema, } from './schemas/publisher.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ReviveModule } from '../revive/revive.module';
import { UsersModule } from '../users/users.module';
import { ZoneModule } from '../zone/zone.module';

@Module({
  imports: [
    UsersModule,
    ReviveModule,
    UsersModule,
    ZoneModule,
  ],
  controllers: [PublishersController],
  providers: [PublishersService]
})
export class PublishersModule { }
