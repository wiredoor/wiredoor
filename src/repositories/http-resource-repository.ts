import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { HttpResource } from '../database/models/http-resource';
import BaseRepository from './base-repository';

@Service()
export class HttpResourceRepository extends BaseRepository<HttpResource> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(HttpResource, dataSource);
  }
}
