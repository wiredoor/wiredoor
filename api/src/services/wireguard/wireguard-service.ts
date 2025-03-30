import { Inject, Service } from 'typedi';
import { Node, NodeInfo } from '../../database/models/node';
import { WgInterface } from '../../database/models/wg-interface';
import { NodeRepository } from '../../repositories/node-repository';
import { WgInterfaceRepository } from '../../repositories/wg-interface-repository';
import ClientConfigBuilder from './client-config-builder';
import ServerConfigBuilder from './server-config-builder';
import WGCli, { RuntimeInfo } from '../../utils/wg-cli';
import FileManager from '../../utils/file-manager';
import { CreateNodeType } from '../../validators/node-validators';
import IP_CIDR from '../../utils/ip-cidr';
import config from '../../config';

export interface WGKeyPair {
  privateKey: string;
  publicKey: string;
}

@Service()
class WireguardService {
  constructor (
    @Inject() private readonly wgInterfaceRepository: WgInterfaceRepository,
    @Inject() private readonly nodeRepository: NodeRepository,
  ) {}

  async initialize(wgInterface = 'wg0') {
    await this.saveConfig(wgInterface);
    await this.startWireguard(wgInterface);
  }

  async getAvailableIp(wgInterface = 'wg0') {
    const res = await Promise.all([
      this.wgInterfaceRepository.findOne({
        where: { 
          config: wgInterface 
        }
      }),
      this.nodeRepository.find({
        select: ['address']
      })
    ]);
    return IP_CIDR.getAvailableIP(res[0].subnet, res[1].map((n) => n.address));
  }

  async getClientParams(params: CreateNodeType) {
    const keyPair = await this.genKeyPair();
    const preSharedKey = await WGCli.genPreSharedKey();
    const address = await this.getAvailableIp();

    return {
      address,
      preSharedKey,
      ...params,
      ...keyPair,
    }
  }

  async saveConfig(wgInterface = 'wg0') {
    const res = await Promise.all([
      this.wgInterfaceRepository.findOne({
        where: { 
          config: wgInterface 
        }
      }),
      this.nodeRepository.find({
        where: {
          enabled: true,
          wgInterface,
        }
      })
    ]);

    const serverConfig = res[0];
    const clients = res[1];

    const config = this.getServerConfig(serverConfig, clients);

    await FileManager.saveToFile(`/etc/wireguard/${wgInterface}.conf`, config, 'utf-8', 0o600);
  }

  async loadConfig (wgInterface = 'wg0'): Promise<void> {
    await this.saveConfig(wgInterface);

    await WGCli.syncConf(wgInterface);
  }

  async getClientConfig(node: Node, wgInterface = 'wg0') {
    const serverConfig = await this.wgInterfaceRepository.findOne({where: { config: wgInterface }});

    return (new ClientConfigBuilder(serverConfig, node)).build();
  }

  async getClientWGConfig(node: Node, wgInterface = 'wg0') {
    const serverConfig = await this.wgInterfaceRepository.findOne({where: { config: wgInterface }});

    return {
      privateKey: node.privateKey,
      address: `${node.address}/32`,
      postUp: node.isGateway ? [`iptables -t nat -A POSTROUTING -s ${serverConfig.subnet} -o eth0 -j MASQUERADE`] : [],
      postDown: node.isGateway ? [`iptables -t nat -D POSTROUTING -s ${serverConfig.subnet} -o eth0 -j MASQUERADE`] : [],
      peer: {
        publicKey: serverConfig.publicKey,
        preSharedKey: node.preSharedKey,
        allowedIPs: node.allowInternet ? ["0.0.0.0/0", "::/0"] : serverConfig.subnet,
        persistentKeepalive: 25,
        endpoint: {
          url: `${config.wireguard.host}:${serverConfig.port}`,
          host: config.wireguard.host,
          port: config.wireguard.port
        }

      }
    };
  }

  async getRuntimeInfo(nodes: Node[], wgInterface = 'wg0'): Promise<NodeInfo[]> {
    try {
      const info = await WGCli.dumpRunTimeInfo(wgInterface);

      return nodes.map((n) => {
        const { publicKey, privateKey, preSharedKey, ...nodeProperties } = n;

        const nodeInfo = info?.filter((i) => i.publicKey === n.publicKey)[0];

        return {
          ...nodeProperties,
          clientIp: nodeInfo ? nodeInfo.clientIp : null,
          latestHandshakeTimestamp: nodeInfo ? nodeInfo.latestHandshake * 1000 : null,
          transferRx: nodeInfo ? nodeInfo.transferRx : null,
          transferTx: nodeInfo ? nodeInfo.transferTx : null,
          status: this.getTunnelStatus(n, nodeInfo)
        }
      });
    } catch (e: any) {
      console.error(e.message)
      return nodes;
    }
  }

  async getNodeRuntimeInfo(node: Node, wgInterface = 'wg0'): Promise<NodeInfo> {
    try {
      const info = await WGCli.dumpPeerRuntimeInfo(node.publicKey, wgInterface);

      const { publicKey, privateKey, preSharedKey, ...nodeProperties } = node;

      return {
        ...nodeProperties,
        clientIp: info ? info.clientIp : null,
        transferRx: info ? info.transferRx : null,
        transferTx: info ? info.transferTx : null,
        latestHandshakeTimestamp: info ? info.latestHandshake * 1000 : null,
        status: this.getTunnelStatus(node, info)
      }
    } catch (e: any) {
      console.error(e.message)
      return node;
    }
  }

  private getTunnelStatus (node: Node, runtimeInfo: RuntimeInfo): 'online' | 'offline' | 'idle' {
    if (!node.enabled || !runtimeInfo?.latestHandshake) return 'offline';

    // if latest hadshake was less than 180 seconds ago
    if (Date.now() / 1000 - runtimeInfo.latestHandshake < 180) {
      return 'online'
    } else {
      return 'idle'
    }
  }

  private getServerConfig(serverConfig: WgInterface, clients: Node[]): string {
    const configBuilder = new ServerConfigBuilder(serverConfig)

    for (const client of clients) {
      configBuilder.addClient(client);
    }

    return configBuilder.build();
  }

  private async genKeyPair(): Promise<WGKeyPair> {
    const privateKey = await WGCli.genPrivateKey();
    const publicKey = await WGCli.genPublicKey(privateKey);

    return {privateKey, publicKey};
  }

  private async startWireguard(wgInterface = 'wg0') {
    try {
      await WGCli.quickUp(wgInterface);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  private async restartWireguard(wgInterface = 'wg0') {
    try {
      await WGCli.quickDown(wgInterface);
      await WGCli.quickUp(wgInterface);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}

export default WireguardService;