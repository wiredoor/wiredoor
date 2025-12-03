import { Request, Response, NextFunction } from 'express';
import { BaseLoggerConfig, CoreLogger } from './logger';

export type ExpressErrorHandler = (
  err: Error & { statusCode?: number; code?: string },
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

export interface ExpressLoggerConfig extends BaseLoggerConfig {
  errorHandler?: ExpressErrorHandler;
  captureBody?: boolean;
  maxBodyLength?: number;
}

export class ExpressLogger extends CoreLogger {
  private readonly errorHandler?: ExpressErrorHandler;

  constructor(config: ExpressLoggerConfig = {}) {
    super(config);
    this.errorHandler = config.errorHandler;
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const startTime = Date.now();

      const requestId =
        (req.headers['x-request-id'] as string) ||
        (req.headers['x-correlation-id'] as string) ||
        this.generateId();

      req.id = requestId;
      req.logger = this.child({
        requestId,
        req_method: req.method,
        req_path: req.path,
        req_query: req.query,
        req_body: req.body,
        req_ip: req.ip,
        req_ips: req.ips,
        req_headers: {
          host: req.headers['host'],
          userAgent: req.headers['user-agent'],
          referer: req.headers['referer'],
          origin: req.headers['origin'],
          xForwardedFor: req.headers['x-forwarded-for'],
          xRealIp: req.headers['x-real-ip'],
        },
      });

      req.logger.info('incoming request', {
        event: 'request',
      });

      // Capturar respuesta
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        const level =
          res.statusCode >= 500
            ? 'error'
            : res.statusCode >= 400
              ? 'warn'
              : 'info';

        if (level === 'error') {
          req.logger[level]('request completed with error', null, {
            duration,
            status_code: res.statusCode,
            status_message: res.statusMessage,
            status_class: Math.floor(res.statusCode / 100) + 'xx',
            event: 'response',
          });
        } else {
          req.logger[level]('request completed', {
            duration,
            status_code: res.statusCode,
            status_message: res.statusMessage,
            status_class: Math.floor(res.statusCode / 100) + 'xx',
            event: 'response',
          });
        }
      });

      next();
    };
  }

  errorMiddleware() {
    return (
      err: Error & { statusCode?: number; code?: string },
      req: Request,
      res: Response,
      next: NextFunction,
    ): void => {
      const logger = req.logger || this.logger;

      logger.error(err.message || 'Request error', err as any, {
        requestId: req.id,
        event: 'error',
        error_type: err.name,
        error_code: err.code || err.statusCode,
        error_stack: err.stack,
      });

      if (this.errorHandler) {
        return this.errorHandler(err, req, res, next);
      }

      const response: any = {
        error: err.message,
        requestId: req.id,
      };

      if (this.config.environment !== 'production') {
        response.stack = err.stack;
      }

      res.status(err.statusCode || 500).json(response);
    };
  }

  captureExceptions(): void {
    process.on('uncaughtException', (error: Error) => {
      this.fatal('Uncaught Exception - Application will exit', {
        err: error,
        event: 'uncaught_exception',
      });
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason: any) => {
      this.error('Unhandled Promise Rejection', reason, {
        event: 'unhandled_rejection',
      });
    });
  }
}

export interface ExpressLoggerSetup {
  logger: ExpressLogger;
  middleware: ReturnType<ExpressLogger['middleware']>;
  errorMiddleware: ReturnType<ExpressLogger['errorMiddleware']>;
  captureExceptions: () => void;
}

export function createExpressLogger(
  config: ExpressLoggerConfig = {},
): ExpressLoggerSetup {
  const logger = new ExpressLogger(config);

  return {
    logger,
    middleware: logger.middleware(),
    errorMiddleware: logger.errorMiddleware(),
    captureExceptions: logger.captureExceptions.bind(logger),
  };
}
