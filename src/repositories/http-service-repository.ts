import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { HttpService } from '../database/models/http-service';
import BaseRepository from './base-repository';

@Service()
export class HttpServiceRepository extends BaseRepository<HttpService> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(HttpService, dataSource);
  }
}
