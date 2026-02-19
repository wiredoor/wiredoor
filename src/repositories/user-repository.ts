import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { User } from '../database/models/user';
import BaseRepository from './base-repository';

@Service()
export class UserRepository extends BaseRepository<User> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(User, dataSource);
  }
}
