import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import BaseRepository from './base-repository';
import { HttpAccessRuleEntity } from '../database/models/http-access-rules';

@Service()
export class HttpAccessRuleRepository extends BaseRepository<HttpAccessRuleEntity> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(HttpAccessRuleEntity, dataSource);
  }
}
