import client from 'prom-client';
import { Inject, Service } from 'typedi';
import { NodesService } from './nodes-service';
import { Node, NodeInfo } from '../database/models/node';

@Service()
export class MetricsService {
  private readonly registry = new client.Registry();

  private readonly nodeInfo = new client.Gauge({
    name: 'wireguard_peer_info',
    help: 'Node Information',
    labelNames: ['device', 'public_key', 'endpoint', 'allowed_ips'],
  });

  private readonly handshake = new client.Gauge({
    name: 'wireguard_last_handshake_seconds',
    help: 'Seconds from the last handshake',
    labelNames: ['device', 'public_key'],
  });

  private readonly rx = new client.Gauge({
    name: 'wireguard_receive_bytes_total',
    help: 'Bytes received from the peer',
    labelNames: ['device', 'public_key'],
  });

  private readonly tx = new client.Gauge({
    name: 'wireguard_transmit_bytes_total',
    help: 'Bytes sent to the peer',
    labelNames: ['device', 'public_key'],
  });

  constructor(@Inject() private readonly nodesService: NodesService) {
    this.registry.setDefaultLabels({ app: 'wiredoor' });
    this.registry.registerMetric(this.nodeInfo);
    this.registry.registerMetric(this.handshake);
    this.registry.registerMetric(this.rx);
    this.registry.registerMetric(this.tx);
    // client.collectDefaultMetrics({ register: this.registry });
  }

  public async getMetrics(): Promise<string> {
    await this.updateWireguardMetrics();
    return this.registry.metrics();
  }

  private async updateWireguardMetrics(): Promise<void> {
    const wgInterface = 'wg0';

    const records: Node[] = (await this.nodesService.getNodes({
      wgInterface: wgInterface,
    })) as unknown as Node[];
    const nodes: NodeInfo[] = await this.nodesService.getNodesRuntime(
      records,
      wgInterface,
      false,
    );

    for (const node of nodes) {
      const device = node.wgInterface;
      const public_key = node.name;
      const endpoint = node.clientIp ?? '';
      const allowed_ips = node.address;

      this.nodeInfo.set({ device, public_key, endpoint, allowed_ips }, 1);

      if (node.latestHandshakeTimestamp) {
        this.handshake.set(
          { device, public_key },
          Math.floor(node.latestHandshakeTimestamp / 1000),
        );
      }

      if (typeof node.transferRx === 'number') {
        this.rx.set({ device, public_key }, node.transferRx);
      }

      if (typeof node.transferTx === 'number') {
        this.tx.set({ device, public_key }, node.transferTx);
      }
    }
  }
}
