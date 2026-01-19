import { Service } from 'typedi';
import { randomBytes, createHash } from 'crypto';
import { Session } from '../database/models/session';
import { SessionRepository } from '../repositories/session-repository';

@Service()
export class SessionService {
  constructor(private readonly sessionRepository: SessionRepository) {}

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

  async getValidSessionBySid(sid: string): Promise<Session | null> {
    const sidHash = this.hashSid(sid);

    const session = await this.sessionRepository.findOne({
      where: { sidHash },
    });
    if (!session) return null;

    if (session.revokedAt) {
      await this.sessionRepository.delete({ id: session.id });
      return null;
    }
    if (session.expiresAt.getTime() <= Date.now()) return null;

    // sliding session: actualiza lastSeen
    session.lastSeenAt = new Date();
    await this.sessionRepository.save(session);

    return session;
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
