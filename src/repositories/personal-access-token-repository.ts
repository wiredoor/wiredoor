import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { PersonalAccessToken } from '../database/models/personal-access-token';
import BaseRepository from './base-repository';

@Service()
export class PersonalAccessTokenRepository extends BaseRepository<PersonalAccessToken> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(PersonalAccessToken, dataSource);
  }
}
