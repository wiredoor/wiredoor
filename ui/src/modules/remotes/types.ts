export type NodeRow = {
  id: number;
  status: 'online' | 'offline';
  name: string;
  isGateway: boolean;
  latestHandshakeTimestamp: number;
  transferRx: number;
  transferTx: number;
  enabled: boolean;
};
