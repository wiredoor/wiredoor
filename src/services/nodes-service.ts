import { Service } from 'typedi';
import { Response } from 'express';
import { EntityManager } from 'typeorm';
import { NodeRepository } from '../repositories/node-repository';
import { Node } from '../database/models/node';
import {
  CreateNodeType,
  NodeFilterQueryParams,
  NodeInfo,
  NodeWithToken,
} from '../schemas/node-schemas';
import WireguardService, {
  WGConfigObject,
} from './wireguard/wireguard-service';
import { HttpServicesService } from './http-services-service';
import { TcpServicesService } from './tcp-services-service';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { NodeQueryFilter } from '../repositories/filters/node-query-filter';
import Net from '../utils/net';
import { NodeApiKeyRepository } from '../repositories/node-api-key-repository';
import { PagedData } from '../schemas/shared-schemas';

@Service()
export class NodesService {
  constructor(
    private readonly nodeRepository: NodeRepository,
    private readonly nodeFilter: NodeQueryFilter,
    private readonly wireguardService: WireguardService,
    private readonly httpServicesService: HttpServicesService,
    private readonly tcpServicesService: TcpServicesService,
    private readonly nodeApiKeyRepository: NodeApiKeyRepository,
  ) {}

  public async initialize(): Promise<void> {
    const gateways = await this.nodeRepository.find({
      where: { isGateway: true },
    });

    for (const gw of gateways) {
      if (gw.enabled) {
        await this.configureGateway(gw);
      }
    }
  }

  public async getAll(): Promise<Node[]> {
    return this.nodeRepository.find();
  }

  public async getNodes(
    filters: NodeFilterQueryParams,
  ): Promise<Node | Node[] | PagedData<Node>> {
    return this.nodeFilter.apply(filters);
  }

  public async getNodesRuntime(
    nodes?: Node[],
    wgInterface?: string,
    checkPing?: boolean,
  ): Promise<NodeInfo[]> {
    if (!nodes) {
      nodes = await this.getAll();
    }

    return this.wireguardService.getRuntimeInfo(nodes, wgInterface, checkPing);
  }

  public async createNode(
    params: CreateNodeType,
    manager?: EntityManager,
  ): Promise<Node> {
    const client = await this.wireguardService.getClientParams(params);
    const node = await this.nodeRepository.save(client, manager);

    await this.wireguardService.loadConfig();

    await this.configureGateway(node);

    return node;
  }

  public async createNodeWithTokenKey(
    params: CreateNodeType,
  ): Promise<NodeWithToken> {
    const nodeWithToken = await this.nodeRepository.transaction<NodeWithToken>(
      async (manager) => {
        const client = await this.wireguardService.getClientParams(params);
        const node = await this.nodeRepository.save(client, manager);
        const apiKey = await this.nodeApiKeyRepository.createApiKey(
          {
            nodeId: node.id,
            name: 'default',
          },
          manager,
        );

        return {
          ...node,
          token: apiKey.token,
        };
      },
    );

    await this.wireguardService.loadConfig();

    await this.configureGateway(nodeWithToken as unknown as Node);

    return nodeWithToken;
  }

  public async regenerateApiKey(id: number): Promise<NodeWithToken> {
    const node = await this.getNode(id);

    if (node.isLocal) {
      throw new BadRequestError(`Local node can't be regenerated`);
    }

    return this.nodeRepository.transaction<NodeWithToken>(async (manager) => {
      await this.nodeApiKeyRepository.revokeKeysForNode(id, manager);

      const apiKey = await this.nodeApiKeyRepository.createApiKey(
        {
          nodeId: node.id,
          name: 'default',
        },
        manager,
      );

      return {
        ...node,
        token: apiKey.token,
      };
    });
  }

  public async regenerateNodeKeys(id: number): Promise<NodeWithToken> {
    const node = await this.nodeRepository.findOne({
      where: { id },
    });

    if (node.isLocal) {
      throw new BadRequestError(`Local node can't be regenerated`);
    }

    const regeneratedData = await this.wireguardService.getClientParams(
      {
        name: node.name,
        address: node.address,
        allowInternet: node.allowInternet,
        enabled: node.enabled,
        gatewayNetworks: node.gatewayNetworks,
        isGateway: node.isGateway,
      },
      node.wgInterface,
    );

    const nodeWithToken = await this.nodeRepository.transaction<NodeWithToken>(
      async (manager) => {
        await this.nodeRepository.save({ id, ...regeneratedData }, manager);

        await this.nodeApiKeyRepository.revokeKeysForNode(id, manager);

        const apiKey = await this.nodeApiKeyRepository.createApiKey(
          {
            nodeId: id,
            name: 'default',
          },
          manager,
        );

        return {
          ...node,
          ...regeneratedData,
          token: apiKey.token,
        };
      },
    );

    await this.wireguardService.loadConfig();

    return nodeWithToken;
  }

  public async getNode(
    id: number,
    relations: string[] = [],
    manager?: EntityManager,
  ): Promise<Node> {
    const node = await this.nodeRepository.findOne(
      {
        where: { id },
        relations,
      },
      manager,
    );

    if (!node) {
      throw new NotFoundError('Node not found!');
    }

    return node;
  }

  public async getNodeInfo(
    id: number,
    relations: string[] = [],
  ): Promise<NodeInfo> {
    const node = await this.getNode(id, relations);

    return this.wireguardService.getNodeRuntimeInfo(node);
  }

  public async getNodeRuntime(node: Node): Promise<NodeInfo> {
    return this.wireguardService.getNodeRuntimeInfo(node);
  }

  public async getNodeConfig(id: number): Promise<string> {
    const node = await this.getNode(id);

    if (node.isLocal) {
      throw new BadRequestError(`Local node doesn't have wireguard config`);
    }

    return this.wireguardService.getClientConfig(node);
  }

  public async getNodeWGConfig(id: number): Promise<WGConfigObject> {
    const node = await this.getNode(id);

    if (node.isLocal) {
      throw new BadRequestError(`Local node doesn't have wireguard config`);
    }

    const wgConfig = await this.wireguardService.getClientWGConfig(node);

    return wgConfig;
  }

  public async downloadNodeConfig(
    id: number,
    res: Response,
  ): Promise<Response> {
    const node = await this.getNode(id);

    if (node.isLocal) {
      throw new BadRequestError(`Local node doesn't have wireguard config`);
    }

    const config = await this.wireguardService.getClientConfig(node);

    res.set(
      'Content-Disposition',
      `attachment; filename="wiredoor-${node.name}-config.conf"`,
    );
    res.write(config);

    return res.send();
  }

  public async updateNode(
    id: number,
    params: Partial<CreateNodeType>,
    manager?: EntityManager,
  ): Promise<Node> {
    const old = await this.getNode(id, [], manager);

    if (old.isLocal) {
      throw new BadRequestError(`Local node can't be updated`);
    }

    if (old.isGateway) {
      await this.disableGateway(old);
    }

    await this.nodeRepository.save(
      {
        id,
        ...params,
      },
      manager,
    );

    const updatedNode = await this.getNode(id, [], manager);

    if (updatedNode.isGateway) {
      await this.configureGateway(updatedNode);
    }

    await this.wireguardService.loadConfig();

    return updatedNode;
  }

  public async enableNode(id: number): Promise<Node> {
    return this.updateNode(id, { enabled: true });
  }

  public async disableNode(id: number): Promise<Node> {
    return this.updateNode(id, { enabled: false });
  }

  public async deleteNode(id: number): Promise<string> {
    const old = await this.getNode(id);

    if (old.isLocal) {
      throw new BadRequestError(`Local node can't be deleted`);
    }

    if (old.isGateway) {
      await this.disableGateway(old);
    }

    await this.nodeRepository.delete(id);

    await this.wireguardService.loadConfig();

    await this.httpServicesService.initialize();
    await this.tcpServicesService.initialize();

    return 'Instance deleted';
  }

  private async disableGateway(node: Node): Promise<void> {
    if (node.isGateway && node.gatewayNetworks?.length) {
      for (const network of node.gatewayNetworks) {
        await Net.delRoute(network.subnet, node.address);
      }
    }
  }

  private async configureGateway(node: Node): Promise<void> {
    if (node.isGateway) {
      for (const network of node.gatewayNetworks) {
        await Net.addRoute(network.subnet, node.address, node.wgInterface);
      }
    }
  }
}
