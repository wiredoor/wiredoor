import config from '../../config';
import { WgInterface } from '../../database/models/wg-interface';
import { Node } from '../../database/models/node';

export default class ClientConfigBuilder {
  private config: string;

  constructor(serverConfig: WgInterface, node: Node) {
    this.setConfig(serverConfig, node);
  }

  private setConfig(serverConfig: WgInterface, node: Node): void {
    this.config = `[Interface]
PrivateKey = ${node.privateKey}
Address = ${node.address}/32
${config.wireguard.mtu ? `MTU = ${config.wireguard.mtu}` : ''}
${node.dns ? `DNS = ${node.dns}\n` : ''}
${
  node.isGateway
    ? `${node.gatewayNetworks.map((net) => `PostUp = iptables -A FORWARD -i ${node.wgInterface} -o ${net.interface} -s ${serverConfig.subnet} -d ${net.subnet} -j ACCEPT; iptables -A FORWARD -i ${net.interface} -o ${node.wgInterface} -s ${net.subnet} -d ${serverConfig.subnet} -j ACCEPT; iptables -t nat -A POSTROUTING -s ${serverConfig.subnet} -d ${net.subnet} -o ${net.interface} -j MASQUERADE`).join(`\n`)}
${node.gatewayNetworks.map((net) => `PostDown = iptables -D FORWARD -i ${node.wgInterface} -o ${net.interface} -s ${serverConfig.subnet} -d ${net.subnet} -j ACCEPT; iptables -D FORWARD -i ${net.interface} -o ${node.wgInterface} -s ${net.subnet} -d ${serverConfig.subnet} -j ACCEPT; iptables -t nat -D POSTROUTING -s ${serverConfig.subnet} -d ${net.subnet} -o ${net.interface} -j MASQUERADE`).join(`\n`)}`
    : ''
}

[Peer]
PublicKey = ${serverConfig.publicKey}
PresharedKey = ${node.preSharedKey}
AllowedIPs = ${node.allowInternet ? '0.0.0.0/0, ::/0' : serverConfig.subnet}
PersistentKeepalive = ${node.keepalive}
Endpoint = ${config.wireguard.host}:${serverConfig.port}`;
  }

  public build(): string {
    return this.config;
  }
}
