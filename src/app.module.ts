import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AdServerModule } from './ad-server/ad-server.module';
import { AdvertisersModule } from './advertisers/advertisers.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReviveModule } from './revive/revive.module';
import { CreativeModule } from './creative/creative.module';
import { PublishersModule } from './publishers/publishers.module';
import { ZoneModule } from './zone/zone.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    CampaignsModule,
    AdServerModule,
    AdvertisersModule,
    AuthModule,
    UsersModule,
    ReviveModule,
    CreativeModule,
    PublishersModule,
    ZoneModule,
  ],
})
export class AppModule { }
