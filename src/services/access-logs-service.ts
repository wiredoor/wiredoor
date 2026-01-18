import { Inject, Service } from 'typedi';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import ServerUtils from '../utils/server';
import { LogQueryParams } from '../validators/log-validator';
import { HttpServiceRepository } from '../repositories/http-service-repository';
import { TcpServiceRepository } from '../repositories/tcp-service-repository';
import { Response } from 'express';
import { Logger } from '../logger';

@Service()
export class AccessLogsService {
  constructor(
    @Inject() private readonly httpServiceRepository: HttpServiceRepository,
    @Inject() private readonly tcpServiceRepository: TcpServiceRepository,
  ) {}

  public async responseRealTimeLogs(
    logParams: LogQueryParams,
    res: Response,
  ): Promise<Response> {
    let tail: ChildProcessWithoutNullStreams;

    res.write(`data: ${JSON.stringify(['Getting logs...'])}\n\n`);

    if (logParams.type) {
      if (logParams.type === 'http') {
        const service = await this.httpServiceRepository.findOne({
          where: { id: +logParams.id },
          relations: ['node'],
        });

        const logsDir = ServerUtils.getLogsDir(service.domain || '_');

        tail = spawn('tail', ['-n', '10', '-f', `${logsDir}/access.log`]);
      }
      if (logParams.type === 'tcp') {
        const service = await this.tcpServiceRepository.findOne({
          where: { id: +logParams.id },
          relations: ['node'],
        });

        const logsDir = ServerUtils.getLogsDir(service.domain || '_');

        tail = spawn('tail', [
          '-n',
          '10',
          '-f',
          `${logsDir}/${service.identifier}_stream.log`,
        ]);
      }
    } else {
      const logsDir = ServerUtils.getLogsDir(logParams.domain || '_');

      tail = spawn('tail', ['-n', '10', '-f', `${logsDir}/access.log`]);
    }

    let buffer = '';

    tail.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = '';

      res.write(`data: ${JSON.stringify(lines)}\n\n`);
      res.flush();
    });

    tail.stderr.on('data', (err) => {
      Logger.error('Error getting logs', err);
      res.write(`event: error\ndata: ${err.toString()}\n\n`);
    });

    res.on('close', () => {
      tail.kill();
      res.end();
    });

    return res;
  }
}
