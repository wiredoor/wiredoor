import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { OidcProvider } from '../database/models/oidc-provider';
import BaseRepository from './base-repository';

@Service()
export class OidcProviderRepository extends BaseRepository<OidcProvider> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(OidcProvider, dataSource);
  }
}
