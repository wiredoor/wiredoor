import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { WgInterface } from '../database/models/wg-interface';
import BaseRepository from './base-repository';

@Service()
export class WgInterfaceRepository extends BaseRepository<WgInterface> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(WgInterface, dataSource);
  }
}
