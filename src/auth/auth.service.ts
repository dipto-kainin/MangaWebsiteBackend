import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly MAX_LOGIN_ATTEMPTS = 5;
  private readonly LOGIN_WINDOW_SECONDS = 15 * 60; // 15 minutes
  private readonly loginAttempts = new Map<string, { attempts: number; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Register ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException({ error: 'Email already in use', code: 'CONFLICT' });
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    return { message: 'Registration successful', user };
  }

  // ─── Login ────────────────────────────────────────────────────────────────

  async login(dto: LoginDto, ip: string) {
    // Rate-limit check
    const rateLimitKey = `login:attempts:${ip}`;
    const attempts = this.getLoginAttempts(rateLimitKey);
    if (attempts >= this.MAX_LOGIN_ATTEMPTS) {
      throw new UnauthorizedException({
        error: 'Too many login attempts. Try again later.',
        code: 'RATE_LIMITED',
      });
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      await this.incrementLoginAttempts(rateLimitKey);
      throw new UnauthorizedException({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      await this.incrementLoginAttempts(rateLimitKey);
      throw new UnauthorizedException({ error: 'Invalid credentials', code: 'UNAUTHORIZED' });
    }

    // Clear failed attempts on success
    this.clearLoginAttempts(rateLimitKey);

    // Create session + tokens
    return this.createSession(user);
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException({ error: 'No refresh token', code: 'UNAUTHORIZED' });
    }

    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException({ error: 'Session expired', code: 'UNAUTHORIZED' });
    }

    // Rotate: delete old, create new
    await this.prisma.session.delete({ where: { id: session.id } });
    return this.createSession(session.user);
  }

  // ─── Logout ───────────────────────────────────────────────────────────────

  async logout(refreshToken: string) {
    if (refreshToken) {
      await this.prisma.session.deleteMany({ where: { refreshToken } });
    }
  }

  // ─── Me ───────────────────────────────────────────────────────────────────

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, createdAt: true },
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async createSession(user: { id: string; email: string; role: string }) {
    const accessToken = this.jwt.sign(
      { sub: user.id, role: user.role },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('ACCESS_TOKEN_TTL') ?? '15m',
      },
    );

    const refreshTokenValue = uuidv4();
    const refreshTtl = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    const expiresAt = new Date(Date.now() + refreshTtl);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken: refreshTokenValue,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  private async incrementLoginAttempts(key: string) {
    const now = Date.now();
    const current = this.loginAttempts.get(key);

    if (!current || current.expiresAt <= now) {
      this.loginAttempts.set(key, {
        attempts: 1,
        expiresAt: now + this.LOGIN_WINDOW_SECONDS * 1000,
      });
      return;
    }

    this.loginAttempts.set(key, {
      attempts: current.attempts + 1,
      expiresAt: current.expiresAt,
    });
  }

  private getLoginAttempts(key: string): number {
    const current = this.loginAttempts.get(key);
    if (!current) {
      return 0;
    }

    if (current.expiresAt <= Date.now()) {
      this.loginAttempts.delete(key);
      return 0;
    }

    return current.attempts;
  }

  private clearLoginAttempts(key: string): void {
    this.loginAttempts.delete(key);
  }
}
