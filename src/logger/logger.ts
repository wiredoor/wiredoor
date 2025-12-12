import pino from 'pino';
import { randomBytes } from 'crypto';
import { Sanitizer } from './sanitizer';
import PinoPretty from 'pino-pretty';
import { default as envConfig } from '../config';

export enum LogLevel {
  FATAL = 'fatal',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace',
}

export const LOG_LEVEL_VALUES = {
  [LogLevel.FATAL]: 60,
  [LogLevel.ERROR]: 50,
  [LogLevel.WARN]: 40,
  [LogLevel.INFO]: 30,
  [LogLevel.DEBUG]: 20,
  [LogLevel.TRACE]: 10,
} as const;

export enum Environment {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
  TEST = 'test',
}

export interface BaseLoggerConfig {
  serviceName?: string;
  environment?: Environment | string;
  logLevel?: LogLevel;
  prettyPrint?: boolean;
  sensitiveFields?: string[];
  enableAudit?: boolean;
  customFields?: Record<string, any>;
  // transports?: LogTransport[];
}

export interface ILogger {
  info(msg: string, data?: Record<string, any>): void;
  error(msg: string, error?: Error | null, data?: Record<string, any>): void;
  warn(msg: string, data?: Record<string, any>): void;
  debug(msg: string, data?: Record<string, any>): void;
  fatal(msg: string, data?: Record<string, any>): void;
  trace(msg: string, data?: Record<string, any>): void;
  audit(action: string, data?: Record<string, any>): void;
  child(bindings: Record<string, any>): ILogger;
}

export interface LogEntry {
  level: string;
  msg: string;
  time: string;
  service: string;
  environment: string;
  [key: string]: any;
}

export class CoreLogger implements ILogger {
  protected config: Required<BaseLoggerConfig>;
  protected sanitizer: Sanitizer;
  protected logger: pino.Logger;
  // protected transports: LogTransport[];

  constructor(baseConfig: BaseLoggerConfig = {}) {
    this.config = {
      serviceName: baseConfig.serviceName || 'app',
      environment:
        baseConfig.environment ||
        process.env.NODE_ENV ||
        Environment.PRODUCTION,
      logLevel: baseConfig.logLevel || envConfig.log.level || ('info' as any),
      prettyPrint:
        baseConfig.prettyPrint ??
        (envConfig.log.format === 'console' ||
          process.env.NODE_ENV === Environment.DEVELOPMENT),
      sensitiveFields: baseConfig.sensitiveFields || [],
      enableAudit: baseConfig.enableAudit !== false,
      customFields: baseConfig.customFields || {},
      // transports: config.transports || [],
    };

    this.sanitizer = new Sanitizer(this.config.sensitiveFields);
    // this.transports = this.config.transports;
    this.logger = this.createLogger();
  }

  private createLogger(): pino.Logger {
    const options: pino.LoggerOptions = {
      level: this.config.logLevel,
      base: {
        service: this.config.serviceName,
        environment: this.config.environment,
        ...this.config.customFields,
      },
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      formatters: {
        level: (label) => ({ level: label }),
      },
    };

    if (this.config.prettyPrint) {
      try {
        const prettyStream = PinoPretty({
          colorize: true,
          // translateTime: 'yyyy-mm-dd HH:MM:ss.l',
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: true,
          hideObject: true,
          messageFormat: (log, messageKey) => {
            const msg = log[messageKey] as string | undefined;
            const method = log.req_method as string | undefined;
            const path = log.req_path as string | undefined;
            const statusCode = log.status_code as number | undefined;
            const responseTimeMs = log.duration as number | undefined;
            const clientIp = log.req_ip as string | undefined;
            const authUser = (log.req_headers as any)?.xAuthUser as
              | string
              | undefined;
            // const userAgent = (log.req_headers as any)?.userAgent as
            //   | string
            //   | undefined;
            const requestId = log.requestId as string | undefined;

            const parts: string[] = [];

            if (log.service) parts.push(`[${log.service}]`);
            if (msg) parts.push(`${msg}`);

            if (method || path)
              parts.push(`${method ?? ''} ${path ?? ''}`.trim());
            if (statusCode !== undefined) parts.push(`status=${statusCode}`);
            if (responseTimeMs !== undefined)
              parts.push(`time=${responseTimeMs}ms`);
            if (authUser) parts.push(`user=${authUser}`);
            if (clientIp) parts.push(`ip=${clientIp}`);
            if (requestId) parts.push(`reqId=${requestId}`);
            // if (userAgent) parts.push(`ua="${userAgent}"`);

            return parts.join(' ') + `\n`;
          },
        });
        return pino(options, prettyStream);
      } catch (error) {
        console.error(error);
        console.warn('pino-pretty not installed, using JSON output');
        return pino(options);
      }
    }

    return pino(options);
  }

  child(bindings: Record<string, any>): ILogger {
    const childLogger = Object.create(this);
    childLogger.logger = this.logger.child(this.sanitizer.sanitize(bindings));
    return childLogger;
  }

  info(msg: string, data: Record<string, any> = {}): void {
    this.logger.info(this.sanitizer.sanitize(data), msg);
  }

  error(
    msg: string,
    error: Error | null = null,
    data: Record<string, any> = {},
  ): void {
    const errorData = error ? { err: error, ...data } : data;
    this.logger.error(this.sanitizer.sanitize(errorData), msg);
  }

  warn(msg: string, data: Record<string, any> = {}): void {
    this.logger.warn(this.sanitizer.sanitize(data), msg);
  }

  debug(msg: string, data: Record<string, any> = {}): void {
    this.logger.debug(this.sanitizer.sanitize(data), msg);
  }

  fatal(msg: string, data: Record<string, any> = {}): void {
    this.logger.fatal(this.sanitizer.sanitize(data), msg);
  }

  trace(msg: string, data: Record<string, any> = {}): void {
    this.logger.trace(this.sanitizer.sanitize(data), msg);
  }

  audit(action: string, data: Record<string, any> = {}): void {
    if (!this.config.enableAudit) return;

    this.logger.info(
      this.sanitizer.sanitize({
        ...data,
        audit: true,
        audit_action: action,
        audit_timestamp: new Date().toISOString(),
      }),
      `[AUDIT] ${action}`,
    );
  }

  generateId(): string {
    return randomBytes(16).toString('hex');
  }

  async close(): Promise<void> {
    // await this.logger.flush();
  }
}

export function createLogger(config: BaseLoggerConfig = {}): ILogger {
  const logger = new CoreLogger(config);
  return logger;
}

export class Logger {
  private static _instance: ILogger | null = null;

  static configure(config: BaseLoggerConfig = {}): void {
    Logger._instance = createLogger(config);
  }

  private static get instance(): ILogger {
    if (!Logger._instance) {
      Logger._instance = createLogger({ serviceName: 'logger' });
    }
    return Logger._instance;
  }

  static trace(msg: string, data: Record<string, any> = {}): void {
    Logger.instance.trace(msg, data);
  }

  static debug(msg: string, data: Record<string, any> = {}): void {
    Logger.instance.debug(msg, data);
  }

  static audit(action: string, data: Record<string, any> = {}): void {
    Logger.instance.audit(action, data);
  }

  static info(msg: string, data: Record<string, any> = {}): void {
    Logger.instance.info(msg, data);
  }

  static warn(msg: string, data: Record<string, any> = {}): void {
    Logger.instance.warn(msg, data);
  }

  static error(
    msg: string,
    error: Error | null = null,
    data: Record<string, any> = {},
  ): void {
    Logger.instance.error(msg, error, data);
  }

  static fatal(msg: string, data: Record<string, any> = {}): void {
    Logger.instance.fatal(msg, data);
  }
}
