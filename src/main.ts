import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import * as cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // ─── Global prefix ────────────────────────────────────────────────────────
    app.setGlobalPrefix("api/v1");

    // ─── Cookie parser ────────────────────────────────────────────────────────
    app.use(cookieParser());

    // ─── CORS ─────────────────────────────────────────────────────────────────
    app.enableCors({
        origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
        credentials: true,
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    });

    // ─── Global pipes ─────────────────────────────────────────────────────────
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true, // strip unknown props
            forbidNonWhitelisted: false,
            transform: true, // auto-transform query/body to DTO types
            transformOptions: { enableImplicitConversion: true },
        }),
    );

    // ─── Global exception filter ──────────────────────────────────────────────
    app.useGlobalFilters(new AllExceptionsFilter());

    const port = process.env.PORT ?? 4000;
    await app.listen(port);
    console.log(`🚀 IronVine API running on http://localhost:${port}/api/v1`);
}

bootstrap();
