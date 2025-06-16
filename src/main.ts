import 'reflect-metadata';
import path from 'path';
import express from 'express';
import providers from './providers';
import config from './config';
import FileManager from './utils/file-manager';
import { startPing, stopPing } from './providers/node-monitor';
import rateLimit from 'express-rate-limit';
import { logger } from './providers/logger';

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
    logger.warn(`UI Files not found! ${publicUIPath}`);
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

  if (process.env.NODE_ENV !== 'test') {
    app.listen(config.app.port, () => {
      logger.info(`${config.app.name} listening on port: ${config.app.port}`);
    });

    startPing();
  }

  return app;
}

async function shutDownApp(): Promise<void> {
  // await Container.get<DataSource>('dataSource').destroy();
  stopPing();
}

process.on('SIGINT', shutDownApp);
process.on('SIGTERM', shutDownApp);

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'UncaughtException');
  shutDownApp();
});

loadApp();
