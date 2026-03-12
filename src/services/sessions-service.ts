import { Service } from 'typedi';
import { randomBytes, createHash } from 'crypto';
import { Session } from '../database/models/session';
import { SessionRepository } from '../repositories/session-repository';
import { UserRepository } from '../repositories/user-repository';
import { User } from '../database/models/user';

@Service()
export class SessionService {
  constructor(
    private readonly sessionRepository: SessionRepository,
    private readonly usersRepository: UserRepository,
  ) {}

  createSid(): string {
    return randomBytes(32).toString('base64url');
  }

  hashSid(sid: string): string {
    return createHash('sha256').update(sid).digest('hex');
  }

  async createSession(params: {
    userId: number;
    ip?: string;
    userAgent?: string;
    deviceId?: string;
    ttlDays?: number;
  }): Promise<{ sid: string; session: Session }> {
    const sid = this.createSid();
    const sidHash = this.hashSid(sid);
    const ttlDays = params.ttlDays ?? 30;

    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    const session = this.sessionRepository.create({
      sidHash,
      userId: params.userId,
      expiresAt,
      revokedAt: null,
      lastSeenAt: new Date(),
      ip: params.ip ?? null,
      userAgent: params.userAgent ?? null,
      deviceId: params.deviceId ?? null,
    });

    await this.sessionRepository.save(session);
    return { sid, session };
  }

  async getValidSessionBySid(
    sid: string,
  ): Promise<{ session: Partial<Session>; user: User } | null> {
    const sidHash = this.hashSid(sid);

    const row = await this.sessionRepository
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.user', 'u')
      .where('s.sidHash = :sidHash', { sidHash })
      .andWhere('s.revokedAt IS NULL')
      .andWhere(`s.expiresAt > datetime('now')`)
      .andWhere('u.active = 1')
      .select([
        's.id',
        's.userId',
        's.expiresAt',
        's.revokedAt',
        's.lastSeenAt',
        'u.id',
        'u.email',
        'u.name',
        'u.active',
        'u.isAdmin',
        'u.totpEnabled',
        'u.mustChangePassword',
      ])
      .getOne();

    if (!row) return null;

    if (row.revokedAt) {
      await this.sessionRepository.delete({ id: row.id });
      return null;
    }
    if (row.expiresAt.getTime() <= Date.now()) return null;

    row.lastSeenAt = new Date();
    await this.sessionRepository.save(row);

    const { user, ...sessionData } = row;

    return { session: sessionData, user: user };
  }

  async revokeSessionBySid(sid: string): Promise<void> {
    const sidHash = this.hashSid(sid);
    const session = await this.sessionRepository.findOne({
      where: { sidHash },
    });
    if (!session) return;

    session.revokedAt = new Date();
    await this.sessionRepository.save(session);
  }

  async cleanupSessions(): Promise<{ deleted: number }> {
    return this.sessionRepository.cleanup();
  }
}
