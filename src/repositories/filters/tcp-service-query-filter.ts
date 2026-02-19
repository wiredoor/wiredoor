import { Inject, Service } from 'typedi';
import { RepositoryQueryFilter } from './repository-query-filter';
import { TcpService } from '../../database/models/tcp-service';
import { TcpServiceRepository } from '../tcp-service-repository';
import { SelectQueryBuilder } from 'typeorm';

@Service()
export class TcpServiceQueryFilter extends RepositoryQueryFilter<
  TcpService,
  TcpServiceRepository
> {
  constructor(@Inject() repository: TcpServiceRepository) {
    super(repository);
  }

  protected allowedRelations(): string[] {
    return ['node'];
  }

  nodeId(param = null): SelectQueryBuilder<TcpService> {
    if (param !== null) {
      return this.builder.where({
        nodeId: param,
      });
    }
  }

  domain(param = null): SelectQueryBuilder<TcpService> {
    if (param) {
      return this.builder.where({
        domain: param,
      });
    }
  }
}
