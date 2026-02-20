import crypto from 'crypto';
import { Inject, Service } from 'typedi';
import { DataSource, EntityManager } from 'typeorm';
import { NodeApiKey } from '../database/models/node-api-key';
import config from '../config';
import BaseRepository from './base-repository';
import { generateTokenString, hashToken } from '../utils/cypher';

@Service()
export class NodeApiKeyRepository extends BaseRepository<NodeApiKey> {
  private readonly secret = config.keys.secret;
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(NodeApiKey, dataSource);
  }

  async createApiKey(
    opts: { nodeId: number; name?: string; expiresAt?: Date | null },
    manager?: EntityManager,
  ): Promise<{ apiKey: NodeApiKey; token: string }> {
    const token = generateTokenString(48);
    const tokenHash = hashToken(token, this.secret);

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
    const tokenHash = hashToken(rawToken, this.secret);

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
