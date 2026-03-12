import { Inject, Service } from 'typedi';
import { OidcProvider } from '../../database/models/oidc-provider';
import { RepositoryQueryFilter } from './repository-query-filter';
import { OidcProviderRepository } from '../oidc-provider-repository';

@Service()
export class OidcProviderQueryFilter extends RepositoryQueryFilter<
  OidcProvider,
  OidcProviderRepository
> {
  constructor(@Inject() repository: OidcProviderRepository) {
    super(repository);
  }
}
