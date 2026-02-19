import { Inject, Service } from 'typedi';
import { RepositoryQueryFilter } from './repository-query-filter';
import { HttpService } from '../../database/models/http-service';
import { HttpServiceRepository } from '../http-service-repository';
import { SelectQueryBuilder } from 'typeorm';

@Service()
export class HttpServiceQueryFilter extends RepositoryQueryFilter<
  HttpService,
  HttpServiceRepository
> {
  constructor(@Inject() repository: HttpServiceRepository) {
    super(repository);
  }

  protected allowedRelations(): string[] {
    return ['node'];
  }

  nodeId(param = null): SelectQueryBuilder<HttpService> {
    if (param !== null) {
      return this.builder.where({
        nodeId: param,
      });
    }
  }

  domain(param = null): SelectQueryBuilder<HttpService> {
    if (param) {
      return this.builder.where({
        domain: param,
      });
    }
  }
}
