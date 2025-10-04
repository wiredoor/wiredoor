import { WgInterface } from '../../database/models/wg-interface';
import { Node } from '../../database/models/node';
import config from '../../config';

export default class ServerConfigBuilder {
  private config: string;

  constructor(wgInterface: WgInterface) {
    this.setServer(wgInterface);
  }

  private setServer(wgInterface: WgInterface): void {
    this.config = `# Server
[Interface]
PrivateKey = ${wgInterface.privateKey}
Address = ${wgInterface.address}
ListenPort = ${wgInterface.port}
${config.wireguard.mtu ? `MTU = ${config.wireguard.mtu}` : ''}
PreUp = ${wgInterface.preUp}
PostUp = ${wgInterface.postUp}
PreDown = ${wgInterface.preDown}
PostDown = ${wgInterface.postDown}
`;
  }

  public addClient(client: Node): ServerConfigBuilder {
    this.config += `
# ${client.isGateway ? 'Gateway' : 'Client'} ${client.name} (${client.id})
[Peer]
PublicKey = ${client.publicKey}
PresharedKey = ${client.preSharedKey}
AllowedIPs = ${client.address}/32${client.isGateway && client.gatewayNetworks ? `, ${client.gatewayNetworks.map((net) => net.subnet).join(', ')}` : ''}
`;
    return this;
  }

  public build(): string {
    return this.config;
  }
}
