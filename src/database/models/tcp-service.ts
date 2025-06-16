import { Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import config from '../../config';
import { Node } from './node';
import { getTtlFromExpiresAt } from '../../utils/ttl-utils';

@Entity('tcp_services')
@Index('unique_port_per_node', ['backendPort', 'nodeId'], { unique: true })
export class TcpService {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 40,
  })
  name: string;

  @Column({
    length: 40,
    nullable: true,
  })
  domain: string;

  @Column({
    default: 'tcp',
  })
  proto: string;

  @Column({
    nullable: true,
  })
  backendHost: string;

  @Column()
  backendPort: number;

  @Column({
    unique: true,
  })
  port: number;

  @Column('boolean', {
    default: false,
  })
  ssl: boolean;

  @Column()
  nodeId: number;

  @Column('boolean', {
    default: true,
  })
  enabled: boolean;

  @Column({
    type: 'json',
    nullable: true,
  })
  allowedIps: string[];

  @Column({
    type: 'json',
    nullable: true,
  })
  blockedIps: string[];

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date;

  @ManyToOne(() => Node, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'nodeId' })
  node: Node;

  @CreateDateColumn()
  //@CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  created_at: Date;

  @UpdateDateColumn()
  //@UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  updated_at: Date;

  @Expose()
  get publicAccess(): string {
    return `${this.proto}://${this.domain ? this.domain : config.wireguard.host}:${this.port}`;
  }

  get identifier(): string {
    return `n${this.nodeId}s${this.id}_stream`;
  }

  get ttl(): string | null {
    return getTtlFromExpiresAt(this.expiresAt);
  }
}
