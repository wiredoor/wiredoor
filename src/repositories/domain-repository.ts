import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { Domain } from '../database/models/domain';
import BaseRepository from './base-repository';
import Net from '../utils/net';
import { ValidationError } from '../utils/errors/validation-error';
import { Logger } from '../logger';
import { OAUTH2_PROXY_PORT_MAX, OAUTH2_PROXY_PORT_MIN } from '../config';

@Service()
export class DomainRepository extends BaseRepository<Domain> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(Domain, dataSource.createEntityManager());
  }

  getDomainByName(domainName: string): Promise<Domain> {
    return this.findOneBy({ domain: domainName });
  }

  async getAvailablePort(): Promise<number> {
    const min = OAUTH2_PROXY_PORT_MIN;
    const max = OAUTH2_PROXY_PORT_MAX;

    const servicePorts = await this.createQueryBuilder('domain')
      .select('domain.oauth2ServicePort')
      .getRawMany();

    try {
      return Net.getAvailableLocalPort(
        servicePorts.map((s) => s.port).filter((s) => !!s),
        min,
        max,
      );
    } catch (e: Error | any) {
      Logger.error('Error getting available port:', e);
      throw new ValidationError({
        body: [
          {
            field: 'authentication',
            message: e.message,
          },
        ],
      });
    }
  }
}
