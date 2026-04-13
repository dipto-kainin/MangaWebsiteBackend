import express from 'express';
import serverless from 'serverless-http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

let cachedHandler: ReturnType<typeof serverless> | undefined;

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler;
  }

  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

  configureApp(app);
  await app.init();

  cachedHandler = serverless(expressApp);
  return cachedHandler;
}

export default async function handler(req: any, res: any) {
  const server = await getHandler();
  return server(req, res);
}
