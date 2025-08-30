import { Inject, Service } from 'typedi';
import { Node, NodeInfo } from '../../database/models/node';
import { WgInterface } from '../../database/models/wg-interface';
import { NodeRepository } from '../../repositories/node-repository';
import { WgInterfaceRepository } from '../../repositories/wg-interface-repository';
import ClientConfigBuilder from './client-config-builder';
import ServerConfigBuilder from './server-config-builder';
import WGCli, { RuntimeInfo } from '../../utils/wg-cli';
import FileManager from '../../utils/file-manager';
import {
  CreateNodeType,
  NodeClientParams,
} from '../../validators/node-validators';
import IP_CIDR from '../../utils/ip-cidr';
import config from '../../config';
import { getPing } from '../../providers/node-monitor';
import { logger } from '../../providers/logger';

export interface ConnectionStatus {
  status: 'online' | 'offline' | 'idle';
  reachable?: boolean;
  latency?: number | null;
}

export interface WGKeyPair {
  privateKey: string;
  publicKey: string;
}

export interface WGConfigObject {
  privateKey: string;
  address: string;
  postUp: string[];
  postDown: string[];
  peer: {
    publicKey: string;
    preSharedKey: string;
    allowedIPs: string | string[];
    persistentKeepalive: number;
    endpoint: { url: string; host: string; port: string };
  };
}

@Service()
class WireguardService {
  constructor(
    @Inject() private readonly wgInterfaceRepository: WgInterfaceRepository,
    @Inject() private readonly nodeRepository: NodeRepository,
  ) {}

  async initialize(wgInterface = 'wg0'): Promise<void> {
    await this.saveConfig(wgInterface);
    await this.startWireguard(wgInterface);
  }

  async getAvailableIp(wgInterface = 'wg0'): Promise<string> {
    const res = await Promise.all([
      this.wgInterfaceRepository.findOne({
        where: {
          config: wgInterface,
        },
      }),
      this.nodeRepository.find({
        select: ['address'],
      }),
    ]);
    return IP_CIDR.getAvailableIP(
      res[0].subnet,
      res[1].map((n) => n.address),
    );
  }

  async getClientParams(
    params: CreateNodeType,
    wgInterface = 'wg0',
  ): Promise<NodeClientParams> {
    const keyPair = await this.genKeyPair();
    const preSharedKey = await WGCli.genPreSharedKey();
    let address = params.address;

    if (!address) {
      address = await this.getAvailableIp(wgInterface);
    }

    return {
      ...params,
      address,
      preSharedKey,
      wgInterface,
      ...keyPair,
    };
  }

  async saveConfig(wgInterface = 'wg0'): Promise<void> {
    const res = await Promise.all([
      this.wgInterfaceRepository.findOne({
        where: {
          config: wgInterface,
        },
      }),
      this.nodeRepository.find({
        where: {
          enabled: true,
          isLocal: false,
          wgInterface,
        },
      }),
    ]);

    const serverConfig = res[0];
    const clients = res[1];

    const config = this.getServerConfig(serverConfig, clients);

    logger.info(
      `Saving Wireguard config to /etc/wireguard/${wgInterface}.conf`,
    );

    await FileManager.saveToFile(
      `/etc/wireguard/${wgInterface}.conf`,
      config,
      'utf-8',
      0o600,
    );
  }

  async loadConfig(wgInterface = 'wg0'): Promise<void> {
    await this.saveConfig(wgInterface);

    await WGCli.syncConf(wgInterface);
  }

  async getClientConfig(node: Node, wgInterface = 'wg0'): Promise<string> {
    const serverConfig = await this.wgInterfaceRepository.findOne({
      where: { config: wgInterface },
    });

    return new ClientConfigBuilder(serverConfig, node).build();
  }

  async getClientWGConfig(
    node: Node,
    wgInterface = 'wg0',
  ): Promise<WGConfigObject> {
    const serverConfig = await this.wgInterfaceRepository.findOne({
      where: { config: wgInterface },
    });

    return {
      privateKey: node.privateKey,
      address: `${node.address}/32`,
      postUp: node.isGateway
        ? node.gatewayNetworks.map(
            (net) =>
              `iptables -t nat -A POSTROUTING -s ${serverConfig.subnet} -d ${net.subnet} -o ${net.interface} -j MASQUERADE`,
          )
        : [],
      postDown: node.isGateway
        ? node.gatewayNetworks.map(
            (net) =>
              `iptables -t nat -D POSTROUTING -s ${serverConfig.subnet} -d ${net.subnet} -o ${net.interface} -j MASQUERADE`,
          )
        : [],
      peer: {
        publicKey: serverConfig.publicKey,
        preSharedKey: node.preSharedKey,
        allowedIPs: node.allowInternet
          ? ['0.0.0.0/0', '::/0']
          : serverConfig.subnet,
        persistentKeepalive: node.keepalive,
        endpoint: {
          url: `${config.wireguard.host}:${serverConfig.port}`,
          host: config.wireguard.host,
          port: config.wireguard.port,
        },
      },
    };
  }

  async getRuntimeInfo(
    nodes: Node[],
    wgInterface = 'wg0',
    checkPing: boolean = true,
  ): Promise<NodeInfo[]> {
    try {
      const info = await WGCli.dumpRunTimeInfo(wgInterface);

      return nodes.map((n) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { publicKey, privateKey, preSharedKey, ...nodeProperties } = n;

        const nodeInfo = info?.filter((i) => i.publicKey === n.publicKey)[0];

        const status = checkPing
          ? this.getTunnelStatus(n, nodeInfo)
          : undefined;

        return {
          ...nodeProperties,
          clientIp: nodeInfo ? nodeInfo.clientIp : null,
          latestHandshakeTimestamp: nodeInfo
            ? nodeInfo.latestHandshake * 1000
            : null,
          transferRx: nodeInfo ? nodeInfo.transferRx : null,
          transferTx: nodeInfo ? nodeInfo.transferTx : null,
          ...status,
        };
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      logger.error(e);
      return nodes;
    }
  }

  async getNodeRuntimeInfo(node: Node, wgInterface = 'wg0'): Promise<NodeInfo> {
    try {
      const info = await WGCli.dumpPeerRuntimeInfo(node.publicKey, wgInterface);

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { publicKey, privateKey, preSharedKey, ...nodeProperties } = node;

      const status = this.getTunnelStatus(node, info);

      return {
        ...nodeProperties,
        clientIp: info ? info.clientIp : null,
        transferRx: info ? info.transferRx : null,
        transferTx: info ? info.transferTx : null,
        latestHandshakeTimestamp: info ? info.latestHandshake * 1000 : null,
        ...status,
      };
    } catch {
      return node;
    }
  }

  private getTunnelStatus(
    node: Node,
    runtimeInfo: RuntimeInfo,
  ): ConnectionStatus {
    if (!node.enabled || !runtimeInfo?.latestHandshake)
      return { status: 'offline' };

    const pingStatus = getPing(node.address);

    let status = 'idle';

    // if latest hadshake was less than 180 seconds ago
    if (
      Date.now() / 1000 - runtimeInfo.latestHandshake < 180 &&
      pingStatus.reachable
    ) {
      status = 'online';
    }

    return {
      status: status as 'online' | 'idle',
      ...pingStatus,
    };
  }

  private getServerConfig(serverConfig: WgInterface, clients: Node[]): string {
    const configBuilder = new ServerConfigBuilder(serverConfig);

    for (const client of clients) {
      configBuilder.addClient(client);
    }

    return configBuilder.build();
  }

  private async genKeyPair(): Promise<WGKeyPair> {
    const privateKey = await WGCli.genPrivateKey();
    const publicKey = await WGCli.genPublicKey(privateKey);

    return { privateKey, publicKey };
  }

  private async startWireguard(wgInterface = 'wg0'): Promise<void> {
    try {
      const isLink = await WGCli.isLink(wgInterface);
      if (isLink) {
        await WGCli.syncConf(wgInterface);
      } else {
        await WGCli.quickUp(wgInterface);
      }
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  private async restartWireguard(wgInterface = 'wg0'): Promise<void> {
    try {
      await WGCli.quickDown(wgInterface);
      await WGCli.quickUp(wgInterface);
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }
}

export default WireguardService;
