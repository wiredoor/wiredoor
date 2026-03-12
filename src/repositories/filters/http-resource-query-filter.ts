import { Inject, Service } from 'typedi';
import { HttpResource } from '../../database/models/http-resource';
import { RepositoryQueryFilter } from './repository-query-filter';
import { HttpResourceRepository } from '../http-resource-repository';

@Service()
export class HttpResourceQueryFilter extends RepositoryQueryFilter<
  HttpResource,
  HttpResourceRepository
> {
  constructor(@Inject() repository: HttpResourceRepository) {
    super(repository);
  }
}
