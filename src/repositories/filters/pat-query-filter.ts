import { Inject, Service } from 'typedi';
import { RepositoryQueryFilter } from './repository-query-filter';
import { PersonalAccessToken } from '../../database/models/personal-access-token';
import { PersonalAccessTokenRepository } from '../personal-access-token-repository';
import { SelectQueryBuilder } from 'typeorm';

@Service()
export class PatQueryFilter extends RepositoryQueryFilter<
  PersonalAccessToken,
  PersonalAccessTokenRepository
> {
  constructor(@Inject() repository: PersonalAccessTokenRepository) {
    super(repository);
  }

  protected allowedRelations(): string[] {
    return ['node'];
  }

  nodeId(param = null): SelectQueryBuilder<PersonalAccessToken> {
    if (param !== null) {
      return this.builder.where({
        nodeId: param,
      });
    }
  }
}
