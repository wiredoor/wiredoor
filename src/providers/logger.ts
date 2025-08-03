import pino from 'pino';
import pinoHttp from 'pino-http';
import { v4 as uuidv4 } from 'uuid';

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

export const logger = pino({
  level: !isTest ? process.env.LOG_LEVEL || 'info' : 'silent',
  redact: ['req.headers.authorization'],
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: !isProd,
          singleLine: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
});

export const httpLogger = pinoHttp({
  logger: logger,
  genReqId: () => uuidv4(),
  customLogLevel: (res, err) => {
    if (res.statusCode >= 500 || err instanceof Error) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req(req) {
      const url = new URL(
        req.url || '',
        `http://${req.headers.host || 'localhost'}`,
      );

      if (url.searchParams.has('token')) {
        url.searchParams.set('token', 'REDACTED');
      }
      return {
        method: req.method,
        url: url.pathname + url.search,
        id: req.id,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
    err(err) {
      return {
        message: err.message,
        stack: err.stack,
      };
    },
  },
});
