import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HttpService } from './http-service';
import { PersonalAccessToken } from './personal-access-token';
import { TcpService } from './tcp-service';

export interface NodeInfo
  extends Omit<Node, 'publicKey' | 'privateKey' | 'preSharedKey'> {
  clientIp?: string;
  latestHandshakeTimestamp?: number;
  transferRx?: number;
  transferTx?: number;
  status?: 'online' | 'offline' | 'idle';
}

export interface NodeWithToken extends NodeInfo {
  token: string;
}

export interface GatewayNetwork {
  interface: string;
  subnet: string;
}

@Entity('nodes')
export class Node {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 40,
  })
  name: string;

  @Column({
    unique: true,
  })
  address: string;

  @Column({
    type: 'json',
    nullable: true,
  })
  gatewayNetworks: GatewayNetwork[];

  @Column({
    default: 'wg0',
  })
  wgInterface: string;

  @Exclude()
  @Column()
  preSharedKey: string;

  @Exclude()
  @Column()
  publicKey: string;

  @Exclude()
  @Column()
  privateKey: string;

  @Column({
    default: false,
  })
  allowInternet: boolean;

  @Column('boolean', {
    default: true,
  })
  enabled: boolean;

  @Column('boolean', {
    default: false,
  })
  isGateway: boolean;

  @Column('boolean', {
    default: false,
  })
  isLocal: boolean;

  @OneToMany(() => HttpService, (service) => service.node)
  httpServices: HttpService[];

  @OneToMany(() => TcpService, (service) => service.node)
  tcpServices: TcpService[];

  @OneToMany(
    () => PersonalAccessToken,
    (personalAccessToken) => personalAccessToken.node,
  )
  personalAccessTokens: PersonalAccessToken[];

  @CreateDateColumn()
  //@CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  created_at: Date;

  @UpdateDateColumn()
  //@UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  updated_at: Date;
}
