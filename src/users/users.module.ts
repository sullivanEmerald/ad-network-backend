import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Advertiser, AdvertiserSchema } from '../advertisers/schema/advertiser.schema';
import { Publisher, PublisherSchema } from '../publishers/schemas/publisher.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
        discriminators: [
          { name: Advertiser.name, schema: AdvertiserSchema },
          { name: Publisher.name, schema: PublisherSchema },
        ],
      },
    ]),
  ],
  providers: [UsersService],
  exports: [UsersService, MongooseModule]
})
export class UsersModule { }
