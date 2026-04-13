import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser = require('cookie-parser');
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

export function configureApp(app: INestApplication): void {
  const isVercel = process.env.VERCEL === '1';
  const globalPrefix = isVercel ? 'v1' : 'api/v1';

  app.setGlobalPrefix(globalPrefix);

  app.use((req: any, res: any, next: () => void) => {
    if (req.method === 'GET' && req.path === '/') {
      return res.redirect(isVercel ? '/api/v1/docs' : '/api/v1/docs');
    }

    next();
  });

  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('IronVine API')
    .setDescription('IronVine manga backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument, { useGlobalPrefix: true });
}
