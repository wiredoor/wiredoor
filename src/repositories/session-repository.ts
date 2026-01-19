import { Inject, Service } from 'typedi';
import { DataSource } from 'typeorm';
import { Session } from '../database/models/session';
import BaseRepository from './base-repository';

@Service()
export class SessionRepository extends BaseRepository<Session> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(Session, dataSource.createEntityManager());
  }

  async cleanup(): Promise<{ deleted: number }> {
    const expired = await this.createQueryBuilder()
      .delete()
      .from('sessions')
      .where(`expires_at <= datetime('now')`)
      .execute();

    const revokedOld = await this.createQueryBuilder()
      .delete()
      .from('sessions')
      .where(`revoked_at IS NOT NULL`)
      .andWhere(`revoked_at <= datetime('now', '-7 days')`)
      .execute();

    return { deleted: (expired.affected ?? 0) + (revokedOld.affected ?? 0) };
  }
}
