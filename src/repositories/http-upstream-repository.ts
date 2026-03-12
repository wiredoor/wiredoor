import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { HttpUpstream } from '../database/models/http-upstream';
import BaseRepository from './base-repository';

@Service()
export class HttpUpstreamRepository extends BaseRepository<HttpUpstream> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(HttpUpstream, dataSource);
  }
}
