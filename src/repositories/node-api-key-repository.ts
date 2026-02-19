import crypto from 'crypto';
import { Inject, Service } from 'typedi';
import { DataSource, EntityManager } from 'typeorm';
import { NodeApiKey } from '../database/models/node-api-key';
import config from '../config';
import BaseRepository from './base-repository';

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

@Service()
export class NodeApiKeyRepository extends BaseRepository<NodeApiKey> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(NodeApiKey, dataSource);
  }

  private hashToken(rawToken: string): string {
    return crypto
      .createHmac('sha256', config.keys.secret)
      .update(rawToken, 'utf8')
      .digest('hex');
  }
  private createTokenString(): string {
    // 48 bytes random -> 64 chars base64url -> 64 chars token string
    return `${base64url(crypto.randomBytes(48))}`;
  }

  async createApiKey(
    opts: { nodeId: number; name?: string; expiresAt?: Date | null },
    manager?: EntityManager,
  ): Promise<{ apiKey: NodeApiKey; token: string }> {
    const token = this.createTokenString();
    const tokenHash = this.hashToken(token);

    const apiKey = await this.save(
      {
        id: crypto.randomUUID(),
        nodeId: opts.nodeId,
        name: opts.name,
        tokenHash,
        expiresAt: opts.expiresAt,
        revokedAt: null,
        lastUsedAt: null,
      },
      manager,
    );

    return { apiKey, token };
  }

  async revokeKeysForNode(
    nodeId: number,
    manager?: EntityManager,
  ): Promise<void> {
    await this.createQueryBuilder('nodeApiKey', manager)
      .update(NodeApiKey)
      .set({ revokedAt: new Date() })
      .where('"nodeId" = :nodeId', { nodeId })
      .andWhere('"revokedAt" IS NULL')
      .execute();
  }

  async findByToken(
    rawToken: string,
    manager?: EntityManager,
  ): Promise<NodeApiKey | null> {
    const tokenHash = this.hashToken(rawToken);

    const apiKey = await this.findOne(
      {
        relations: ['node'],
        where: { tokenHash },
        select: ['id', 'nodeId', 'revokedAt', 'expiresAt', 'lastUsedAt'],
      },
      manager,
    );

    return apiKey;
  }
}
