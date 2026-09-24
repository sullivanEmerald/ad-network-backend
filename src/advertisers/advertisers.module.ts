import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AdvertisersService } from './advertisers.service';
import { AdvertisersController } from './advertisers.controller';
import { Advertiser, AdvertiserSchema } from './schema/advertiser.schema';
import { UsersModule } from '../users/users.module';
import { AdvertisersRepository } from './advertisers.repositpory';
import { ReviveModule } from '../revive/revive.module';

@Module({
    imports: [
        ConfigModule,
        ReviveModule,
        UsersModule,
    ],
    providers: [AdvertisersService, AdvertisersRepository],
    controllers: [AdvertisersController],
    exports: [AdvertisersService],
})
export class AdvertisersModule { }
