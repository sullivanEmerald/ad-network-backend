import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AdvertisersService } from './advertisers.service';
import { AdvertisersController } from './advertisers.controller';
import { Advertiser, AdvertiserSchema } from './schema/advertiser.schema';
import { AdvertisersRepository } from './advertisers.repositpory';

@Module({
    imports: [
        ConfigModule,
        MongooseModule.forFeature([
            { name: Advertiser.name, schema: AdvertiserSchema },
        ]),
    ],
    providers: [AdvertisersService, AdvertisersRepository],
    controllers: [AdvertisersController],
    exports: [AdvertisersService],
})
export class AdvertisersModule { }
