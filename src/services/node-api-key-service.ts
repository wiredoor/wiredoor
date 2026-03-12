import { NodeApiKeyRepository } from '../repositories/node-api-key-repository';
import { NodeApiKey } from '../database/models/node-api-key';
import Container, { Service } from 'typedi';
import { NodeRepository } from '../repositories/node-repository';

export type CreatedNodeApiKey = {
  apiKey: NodeApiKey;
  token: string;
};

export type VerifiedNodeApiKey = {
  apiKeyId: string;
  nodeId: number;
  nodeName: string;
  address: string;
};

@Service()
export class NodeApiKeyService {
  constructor(private readonly nodeApiKeyRepository: NodeApiKeyRepository) {}

  async create(
    nodeId: number,
    name = 'default',
    expiresAt: Date | null = null,
  ): Promise<CreatedNodeApiKey> {
    return this.nodeApiKeyRepository.createApiKey({ nodeId, name, expiresAt });
  }

  async revoke(apiKeyId: string): Promise<void> {
    await this.nodeApiKeyRepository.update(
      { id: apiKeyId },
      { revokedAt: new Date() },
    );
  }

  async revokeAllForNode(nodeId: number): Promise<void> {
    await this.nodeApiKeyRepository.revokeKeysForNode(nodeId);
  }

  async verify(
    rawToken: string,
    cliVersion?: string,
  ): Promise<VerifiedNodeApiKey | null> {
    if (!rawToken || rawToken.length < 20) return null;

    const apiKey = await this.nodeApiKeyRepository.findByToken(rawToken);

    if (!apiKey) return null;
    if (apiKey.revokedAt) return null;
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now())
      return null;

    const now = new Date();
    const last = apiKey.lastUsedAt?.getTime() ?? 0;
    if (now.getTime() - last > 60_000) {
      await this.nodeApiKeyRepository.update(
        { id: apiKey.id },
        { lastUsedAt: now },
      );
    }

    if (cliVersion && apiKey.node.cliVersion !== cliVersion) {
      await Container.get(NodeRepository).update(
        { id: apiKey.nodeId },
        { cliVersion },
      );
    }

    return {
      apiKeyId: apiKey.id,
      nodeId: apiKey.nodeId,
      nodeName: apiKey.node.name,
      address: apiKey.node.address,
    };
  }
}
