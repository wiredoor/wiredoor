import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { TcpService } from '../database/models/tcp-service';
import config from '../config';
import { ValidationError } from '../utils/errors/validation-error';
import Net from '../utils/net';
import BaseRepository from './base-repository';

@Service()
export class TcpServiceRepository extends BaseRepository<TcpService> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(TcpService, dataSource);
  }

  async getAvailablePort(): Promise<number> {
    if (!config.server.port_range) {
      throw new ValidationError({
        body: [
          {
            field: 'port',
            message:
              'Your servers needs TCP_SERVICES_PORT_RANGE env variable defined.',
          },
        ],
      });
    }

    const min = +config.server.port_range.split('-')[0];
    const max =
      +config.server.port_range.split('-').length == 2
        ? +config.server.port_range.split('-')[1]
        : min;

    const servicePorts = await this.createQueryBuilder('tcpService')
      .select('tcpService.port')
      .getRawMany();

    try {
      return Net.getAvailableLocalPort(
        servicePorts.map((s) => s.port),
        min,
        max,
      );
    } catch (e: any) {
      throw new ValidationError({
        body: [
          {
            field: 'port',
            message: e.message,
          },
        ],
      });
    }
  }
}
