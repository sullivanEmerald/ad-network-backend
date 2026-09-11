import { Body, Controller, Get, Post, UseGuards, HttpCode, Res, UnauthorizedException, Req } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AuthenticatedUser } from "./jwt/jwt-payload.interface";
import type { Response, Request } from 'express';

@Controller("auth")
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post("register")
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post("login")
    @HttpCode(200)
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response,) {
        console.log('logging in', dto)
        const { accessToken, refreshToken } = await this.authService.login(dto);
        this.authService.setAuthCookies(res, accessToken, refreshToken);
        return { message: 'Login successful' };
    }

    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        console.log('refreshing')
        const oldToken = req.cookies['_exrf_'];
        if (!oldToken) throw new UnauthorizedException();
        const { accessToken, refreshToken } = await this.authService.rotateRefreshToken(oldToken);
        this.authService.setAuthCookies(res, accessToken, refreshToken);
        return { ok: true }
    }

    @Get("me")
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser() user: AuthenticatedUser) {
        return user;
    }

    @Post("logout")
    async logout(
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        console.log('logging out')
        const refreshToken = req.cookies["_exrf_"];

        if (refreshToken) {
            await this.authService.revokeRefreshToken(refreshToken);
        }

        this.authService.clearAuthCookies(res);

        return {
            message: "Logged out successfully",
        };
    }
}
