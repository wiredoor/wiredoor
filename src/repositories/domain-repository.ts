import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { Domain } from '../database/models/domain';
import BaseRepository from './base-repository';
import Net from '../utils/net';
import { ValidationError } from '../utils/errors/validation-error';
import { logger } from '../providers/logger';

@Service()
export class DomainRepository extends BaseRepository<Domain> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(Domain, dataSource.createEntityManager());
  }

  getDomainByName(domainName: string): Promise<Domain> {
    return this.findOneBy({ domain: domainName });
  }

  async getAvailablePort(): Promise<number> {
    const min = 4180;
    const max = 5180;

    const servicePorts = await this.createQueryBuilder('domain')
      .select('domain.oauth2ServicePort')
      .getRawMany();

    try {
      return Net.getAvailableLocalPort(
        servicePorts.map((s) => s.port).filter((s) => !!s),
        min,
        max,
      );
    } catch (e: any) {
      logger.error(e);
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
