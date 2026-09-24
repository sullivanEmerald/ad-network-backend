import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Account } from "../users/schemas/account.schema";
import { User } from "../users/schemas/user.schema";
import { Advertiser } from "../advertisers/schema/advertiser.schema";
import { Publisher } from "../publishers/schemas/publisher.schema";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { randomBytes } from "crypto";
import { addDays } from "date-fns";
import { ConfigService } from "@nestjs/config";
import type { JwtPayload } from "./jwt/jwt-payload.interface";
import { RefreshToken } from "./jwt/refresh-token.schema";
import type { Response } from 'express';
import type { RefreshTokenDocument } from "./jwt/refresh-token.schema";
import { ReviveService } from "../revive/revive.service";
import { NotFoundError } from "rxjs";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(Account.name) private accountModel: Model<Account>,
        @InjectModel(User.name) private userModel: Model<User>,
        @InjectModel(Advertiser.name) private advertiserModel: Model<Advertiser>,
        @InjectModel(Publisher.name) private publisherModel: Model<Publisher>,
        @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshToken>,
        private jwtService: JwtService,
        private configService: ConfigService,
        private readonly reviveService: ReviveService
    ) { }

    async issueTokens(user: any) {
        const accessToken = this.jwtService.sign(
            {
                sub: user._id.toString(),
                role: user.role,
                accountType: user.accountType,
            },
            {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: parseInt(this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '7', 10) * 24 * 60 * 60,
            },
        );

        const refreshToken = randomBytes(40).toString('hex');
        const tokenHash = await bcrypt.hash(refreshToken, 10);

        await this.refreshTokenModel.create({
            tokenHash,
            userId: user._id,
            expiresAt: addDays(new Date(), 7),
        });

        return { accessToken, refreshToken };
    }


    setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('_excu_', accessToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.cookie('_exrf_', refreshToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? 'none' : 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
    }

    async register(dto: RegisterDto) {
        const registrationEmail = dto.accountType === 'publisher'
            ? dto.publisherEmail!
            : dto.advertiserEmail!;
        const existing = await this.userModel.findOne({ email: registrationEmail }).exec();
        if (existing) {
            throw new ConflictException("An account with this email already exists");
        }

        const password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

        let reviveId: number;

        try {
            reviveId = dto.accountType === 'publisher'
                ? await this.reviveService.addPublisher({
                    publisherName: dto.publisherName!,
                    website: dto.website!,
                    contactName: dto.contactName!,
                    emailAddress: dto.publisherEmail!,
                })
                : await this.reviveService.addAdvertiser(
                    dto.advertiserName!,
                    dto.advertiserEmail!,
                );
        } catch (error) {
            console.log('Revive account creation error', error);
            throw new NotFoundException("Error Creating User");
        }

        const userData = {
            email: registrationEmail,
            password,
        };
        const user = dto.accountType === 'publisher'
            ? await this.publisherModel.create({
                ...userData,
                publisherName: dto.publisherName,
                contactName: dto.contactName,
                emailAddress: dto.publisherEmail,
                website: dto.website,
                revivePublisherId: reviveId,
            })
            : await this.advertiserModel.create({
                ...userData,
                advertiserName: dto.advertiserName,
                advertiserEmail: dto.advertiserEmail,
                reviveAdvertiserId: reviveId,
            });

        return user;
    }

    async login(dto: LoginDto) {
        const { email, password } = dto;
        const user = await this.userModel.findOne({ email }).exec();
        if (!user) {
            throw new UnauthorizedException('Invalid User Credentials');
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid User Credentials');
        }
        const { accessToken, refreshToken } = await this.issueTokens(user);
        return { accessToken, refreshToken, user: { id: user._id, accountType: user.accountType } };
    }

    async rotateRefreshToken(oldToken: string) {
        const candidates = await this.refreshTokenModel.find({ revoked: false });
        const match = await this.findMatchingToken(candidates, oldToken);

        if (!match) throw new UnauthorizedException('Invalid refresh token');
        if (match.expiresAt < new Date()) throw new UnauthorizedException('Expired refresh token');

        match.revoked = true;
        await match.save();

        const user = await this.userModel.findById(match.userId.toString());
        return this.issueTokens(user);
    }

    private async findMatchingToken(candidates: RefreshTokenDocument[], raw: string) {
        for (const c of candidates) {
            if (await bcrypt.compare(raw, c.tokenHash)) return c;
        }
        return null;
    }


    clearAuthCookies(res: Response) {
        const isProd = process.env.NODE_ENV === "production";

        res.clearCookie("_excu_", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
        });

        res.clearCookie("_exrf_", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            path: "/",
        });
    }

    async revokeRefreshToken(rawToken: string) {
        const candidates = await this.refreshTokenModel.find({ revoked: false });
        const match = await this.findMatchingToken(candidates, rawToken);
        if (match) {
            match.revoked = true;
            await match.save();
        }
    }

}
