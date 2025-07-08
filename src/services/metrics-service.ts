import client from 'prom-client';
import { Inject, Service } from 'typedi';
import { NodesService } from './nodes-service';
import { Node, NodeInfo } from '../database/models/node';
import FileManager from '../utils/file-manager';

const METRICS_STATE_FILE = '/data/metrics.json';

type PeerTransferState = {
  rxTotal: number;
  txTotal: number;
  lastRx: number;
  lastTx: number;
};

type MetricsState = {
  [publicKey: string]: PeerTransferState;
};

@Service()
export class MetricsService {
  private state: MetricsState = {};
  private readonly registry = new client.Registry();

  private readonly nodeInfo = new client.Gauge({
    name: 'wireguard_peer_info',
    help: 'Node Information',
    labelNames: ['device', 'public_key', 'endpoint', 'allowed_ips'],
  });

  private readonly handshake = new client.Gauge({
    name: 'wireguard_latest_handshake_seconds',
    help: 'Seconds from the last handshake',
    labelNames: ['device', 'public_key'],
  });

  private readonly rx = new client.Gauge({
    name: 'wireguard_received_bytes_total',
    help: 'Bytes received from the peer',
    labelNames: ['device', 'public_key'],
  });

  private readonly tx = new client.Gauge({
    name: 'wireguard_sent_bytes_total',
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

    this.loadStateFromDisk();
  }

  private loadStateFromDisk(): void {
    try {
      if (FileManager.isPath(METRICS_STATE_FILE)) {
        this.state = JSON.parse(
          FileManager.readFileSync(METRICS_STATE_FILE, 'utf-8'),
        );
      }
    } catch (err) {
      console.warn('Error loading metrics state:', err);
    }
  }

  private saveStateToDisk(): void {
    try {
      FileManager.saveToFile(
        METRICS_STATE_FILE,
        JSON.stringify(this.state),
        'utf-8',
      );
    } catch (err) {
      console.error('Error saving metrics state:', err);
    }
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
      const identifier = `node${node.id}`;
      const device = node.wgInterface;
      const public_key = node.name;
      const endpoint = node.clientIp ?? '';
      const allowed_ips = node.address;
      const currentRx = node.transferRx ?? 0;
      const currentTx = node.transferTx ?? 0;

      const state = this.state[identifier] ?? {
        rxTotal: 0,
        txTotal: 0,
        lastRx: currentRx,
        lastTx: currentTx,
      };

      if (currentRx >= state.lastRx) {
        state.rxTotal += currentRx - state.lastRx;
      } else {
        state.rxTotal += currentRx;
      }

      if (currentTx >= state.lastTx) {
        state.txTotal += currentTx - state.lastTx;
      } else {
        state.txTotal += currentTx;
      }

      state.lastRx = currentRx;
      state.lastTx = currentTx;
      this.state[identifier] = state;

      this.nodeInfo.set({ device, public_key, endpoint, allowed_ips }, 1);

      if (node.latestHandshakeTimestamp) {
        this.handshake.set(
          { device, public_key },
          Math.floor(node.latestHandshakeTimestamp / 1000),
        );
      }

      this.rx.set({ device, public_key }, state.rxTotal);

      this.tx.set({ device, public_key }, state.txTotal);
    }

    this.saveStateToDisk();
  }
}
