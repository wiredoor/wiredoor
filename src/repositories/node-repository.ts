import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { Node } from '../database/models/node';
import BaseRepository from './base-repository';

@Service()
export class NodeRepository extends BaseRepository<Node> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(Node, dataSource);
  }
}
