import { Body, Controller, Get, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

const COOKIE_NAME = "refresh_token";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
};

@Controller("auth")
export class AuthController {
    constructor(private authService: AuthService) {}

    // POST /api/v1/auth/register
    @Post("register")
    @HttpCode(201)
    async register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    // POST /api/v1/auth/login
    @Post("login")
    @HttpCode(200)
    async login(
        @Body() dto: LoginDto,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        const ip = (req.headers["x-forwarded-for"] as string) || req.ip;
        const { accessToken, refreshToken, user } = await this.authService.login(dto, ip);

        res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
        return { accessToken, user };
    }

    // POST /api/v1/auth/refresh
    @Post("refresh")
    @HttpCode(200)
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const token: string = req.cookies?.[COOKIE_NAME];
        const { accessToken, refreshToken } = await this.authService.refresh(token);

        res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);
        return { accessToken };
    }

    // POST /api/v1/auth/logout
    @Post("logout")
    @UseGuards(JwtAuthGuard)
    @HttpCode(204)
    async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const token: string = req.cookies?.[COOKIE_NAME];
        await this.authService.logout(token);
        res.clearCookie(COOKIE_NAME, { path: "/" });
    }

    // GET /api/v1/auth/me
    @Get("me")
    @UseGuards(JwtAuthGuard)
    async me(@CurrentUser("userId") userId: string) {
        return this.authService.me(userId);
    }
}
