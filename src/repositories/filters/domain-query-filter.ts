import { Inject, Service } from 'typedi';
import { Domain } from '../../database/models/domain';
import { RepositoryQueryFilter } from './repository-query-filter';
import { DomainRepository } from '../domain-repository';

@Service()
export class DomainQueryFilter extends RepositoryQueryFilter<
  Domain,
  DomainRepository
> {
  constructor(@Inject() repository: DomainRepository) {
    super(repository);
  }
}
