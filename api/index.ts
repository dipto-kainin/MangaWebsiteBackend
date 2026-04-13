import express from 'express';
import serverless from 'serverless-http';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

let cachedHandler: ReturnType<typeof serverless> | undefined;
let initPromise: Promise<ReturnType<typeof serverless>> | undefined;

async function getHandler() {
  if (cachedHandler) {
    return cachedHandler;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const expressApp = express();
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));

    configureApp(app);

    await Promise.race([
      app.init(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('App init timeout')), 15000)),
    ]).catch((err) => {
      console.warn('[Serverless] App init failed:', err.message);
    });

    cachedHandler = serverless(expressApp);
    return cachedHandler;
  })();

  return initPromise;
}

export default async function handler(req: any, res: any) {
  const server = await getHandler();
  return server(req, res);
}
