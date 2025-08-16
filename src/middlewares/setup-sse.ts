import { ExpressMiddlewareInterface } from 'routing-controllers';
import { Service } from 'typedi';
import { NextFunction, Request, Response } from 'express';
import { logger } from '../providers/logger';

export interface ResponseSSE extends Response {
  sendDataAsStream(data: unknown): void;
}

@Service()
export class SetupSSE implements ExpressMiddlewareInterface {
  constructor() {}

  async use(
    req: Request,
    res: ResponseSSE,
    next: (err?: unknown) => NextFunction,
  ): Promise<void> {
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Connection', 'keep-alive');

    // eslint-disable-next-line no-prototype-builtins
    if (res.hasOwnProperty('flushHeaders')) {
      res.flushHeaders();
    }

    res.sendDataAsStream = (data): void => {
      try {
        if (!data) {
          return;
        }

        const payload = `data: ${JSON.stringify(data)}\n\n`;

        // eslint-disable-next-line no-prototype-builtins
        if (res.hasOwnProperty('flush')) {
          res.flush();
        }

        res.write(payload);
      } catch (e) {
        logger.error(e, 'Error sending event stream');
      }
    };

    req.on('close', () => {
      res.end();
    });

    next();
  }
}
