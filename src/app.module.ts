import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AuthModule } from './auth/auth.module';
import { MangaModule } from './manga/manga.module';
import { ChaptersModule } from './chapters/chapters.module';
import { GenresModule } from './genres/genres.module';
import { UsersModule } from './users/users.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    // Config — loads .env
    ConfigModule.forRoot({ isGlobal: true }),

    // Global rate limiter
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minute window
        limit: 100, // 100 requests
      },
    ]),

    // Infrastructure
    PrismaModule,
    CloudinaryModule,

    // Feature modules
    AuthModule,
    MangaModule,
    ChaptersModule,
    GenresModule,
    UsersModule,
    StatsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
