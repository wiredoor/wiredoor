import 'reflect-metadata';
import path from 'path';
import http from 'http';
import express from 'express';
import providers from './providers';
import config from './config';
import FileManager from './utils/file-manager';
import { startPing, stopPing } from './providers/node-monitor';
import rateLimit from 'express-rate-limit';
import { Logger } from './logger';

let server: http.Server | null = null;

export async function loadApp(): Promise<express.Application> {
  const app = express();

  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'Wiredoor Server');
    next();
  });

  await providers(app);

  const publicUIPath = path.join(process.cwd(), 'public');

  if (FileManager.isFile(publicUIPath, 'index.html')) {
    app.use('/', express.static(publicUIPath));
  } else {
    Logger.warn(`UI Files not found! ${publicUIPath}`);
    app.get('/', (req, res) => {
      return res.status(200).end(`Welcome to ${config.app.name}!`);
    });
  }

  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 'loopback');
    app.use(
      rateLimit({
        windowMs: 60 * 1000, // 1min
        max: 60,
        message: 'Rate Limit exceeded',
      }),
    );
  }

  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(publicUIPath, 'index.html'));
  });

  return app;
}

async function shutDownApp(): Promise<void> {
  // await Container.get<DataSource>('dataSource').destroy();
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server!.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
  stopPing();
}

async function bootstrap(): Promise<void> {
  Logger.configure({ serviceName: 'wiredoor-app' });

  const app = await loadApp();

  server = app.listen(config.app.port, () => {
    Logger.info(`${config.app.name} listening on port: ${config.app.port}`);
  });

  startPing();

  process.on('SIGINT', () => {
    shutDownApp().finally(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    shutDownApp().finally(() => process.exit(0));
  });

  process.on('uncaughtException', (err: Error) => {
    Logger.error('Uncaught Exception - Application will exit', err, {
      event: 'uncaught_exception',
    });
    shutDownApp().finally(() => setTimeout(() => process.exit(1), 1000));
  });
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    Logger.error('Failed to bootstrap application', err);
    process.exit(1);
  });
}
