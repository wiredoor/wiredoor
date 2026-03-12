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
import { HttpResource } from './http-resource';
import {
  HttpRewrite,
  RuleMatchType,
} from '../../schemas/http-resource-schemas';

@Entity('http_upstreams')
export class HttpUpstream {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', default: 'prefix' })
  type: RuleMatchType; // 'prefix' | 'exact' | 'regex'

  @Column({ default: '/' })
  pathPattern: string;

  @Column({ type: 'json', nullable: true })
  rewrite?: HttpRewrite | null;

  @Column({ default: 'http' })
  targetProtocol: 'http' | 'https';

  @Column({ default: 'localhost' })
  targetHost: string;

  @Column()
  targetPort: number;

  @Column({ default: false })
  targetSslVerify?: boolean;

  @Index('IDX_http_upstreams_targetNodeId')
  @Column({ nullable: true })
  targetNodeId?: number;

  @Index('IDX_http_upstreams_httpResourceId')
  @Column()
  httpResourceId: number;

  @ManyToOne(() => Node, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'targetNodeId' })
  node: Node;

  @ManyToOne(() => HttpResource, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'httpResourceId' })
  httpResource: HttpResource;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
