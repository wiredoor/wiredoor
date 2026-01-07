import 'reflect-metadata';
import express from 'express';
import Container from 'typedi';
import { MetricsService } from './services/metrics-service';
import db from './providers/db';
import dns from './providers/dns';

export async function loadApp(): Promise<express.Application> {
  const metricsPort = 9586;

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

  app.listen(metricsPort, () => {
    console.log(
      `WireGuard metrics server running at http://127.0.0.1:${metricsPort}/metrics`,
    );
  });

  return app;
}

loadApp();
