import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import type { JwtPayload, AuthenticatedUser } from "../jwt/jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(config: ConfigService) {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret) {
            throw new Error("Missing JWT_SECRET — set it in your environment before starting the app");
        }
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                ExtractJwt.fromAuthHeaderAsBearerToken(),
                (request: Request) => request.cookies?._excu_ ?? null,
            ]),
            ignoreExpiration: false,
            secretOrKey: secret,
        });
    }

    // Runs after the token's signature and expiry are already verified by
    // passport-jwt — this only shapes what lands on req.user.
    validate(payload: JwtPayload): AuthenticatedUser {
        if (!payload.sub || !payload.accountId) {
            throw new UnauthorizedException("Malformed token");
        }
        return { userId: payload.sub, accountId: payload.accountId, role: payload.role };
    }
}
