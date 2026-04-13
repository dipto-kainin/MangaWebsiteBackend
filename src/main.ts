import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`IronVine API running on http://localhost:${port}/api/v1`);
}

bootstrap();
