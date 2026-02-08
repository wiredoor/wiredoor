import 'reflect-metadata';
import express from 'express';
import Container from 'typedi';
import { MetricsService } from './services/metrics-service';
import db from './providers/db';
import dns from './providers/dns';

export async function loadApp(): Promise<express.Application> {
  const app = express();

  await db();

  await dns();

  app.get('/', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send('Wiredoor Metrics Server');
  });

  app.get('/metrics', async (req, res) => {
    try {
      const content = await Container.get(MetricsService).getMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(content);
    } catch (err) {
      console.error('Error generating Prometheus metrics:', err);
      res.set('Content-Type', 'text/plain');
      res.status(500).send(`# error: failed to generate metrics\n`);
    }
  });

  return app;
}

async function bootstrap(): Promise<void> {
  const metricsPort = 9586;

  const app = await loadApp();

  app.listen(metricsPort, () => {
    console.log(`Wiredoor Metrics Server is running on port ${metricsPort}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.log('Failed to bootstrap application', err);
    process.exit(1);
  });
}
