import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "../jwt/jwt-payload.interface";

/**
 * Usage: launch(@CurrentUser() user: AuthenticatedUser, @Body() dto: ...)
 * Only valid on routes behind JwtAuthGuard — req.user won't exist otherwise.
 */
export const CurrentUser = createParamDecorator(
    (_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
        const request = ctx.switchToHttp().getRequest();
        return request.user;
    }
);
