import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import BaseRepository from './base-repository';
import { HttpEdgeRuleEntity } from '../database/models/http-edge-rules';

@Service()
export class HttpEdgeRuleRepository extends BaseRepository<HttpEdgeRuleEntity> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(HttpEdgeRuleEntity, dataSource);
  }
}
