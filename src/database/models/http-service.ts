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
import { Node } from './node';
import config from '../../config';

@Entity('http_services')
@Index('service_port_unique', ['backendPort', 'backendHost', 'nodeId'], {
  unique: true,
})
@Index('domain_path_unique', ['domain', 'pathLocation'], { unique: true })
export class HttpService {
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
    length: 40,
    default: '/',
  })
  pathLocation: string;

  @Column({
    nullable: true,
  })
  backendHost: string;

  @Column({
    default: 80,
  })
  backendPort: number;

  @Column({
    default: 'http',
  })
  backendProto: string;

  @Column()
  nodeId: number;

  @Column('boolean', {
    default: true,
  })
  enabled: boolean;

  @Column('boolean', {
    default: false,
  })
  requireAuth: boolean;

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
    const link = new URL(
      this.pathLocation,
      this.domain
        ? `https://${this.domain}`
        : `https://${config.wireguard.host}`,
    );

    return link.href;
  }

  get identifier(): string {
    return `node${this.nodeId}service${this.id}`;
  }
}
