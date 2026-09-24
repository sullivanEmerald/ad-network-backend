import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';
import { Advertiser } from '../advertisers/schema/advertiser.schema';
import { Publisher } from '../publishers/schemas/publisher.schema';
import { Account, AccountSchema } from '../users/schemas/account.schema';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RefreshToken, RefreshTokenSchema } from './jwt/refresh-token.schema';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ReviveModule } from '../revive/revive.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Account.name, schema: AccountSchema },
      { name: RefreshToken.name, schema: RefreshTokenSchema },
    ]),
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: parseInt(configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '7', 10) * 24 * 60 * 60,
        },
      }),
    }),
    PassportModule,
    ReviveModule
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy]
})
export class AuthModule { }


