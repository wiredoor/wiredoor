import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { EdgeAction, RuleMatchType } from '../../schemas/http-resource-schemas';
import { HttpResource } from './http-resource';

@Entity('http_edge_rules')
@Index(['httpResourceId', 'enabled'])
@Index(['httpResourceId', 'order'])
@Index(['httpResourceId', 'matchType'])
export class HttpEdgeRuleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'integer' })
  httpResourceId!: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'integer', default: 1000 })
  order!: number;

  @Column({ name: 'match_type', type: 'text' })
  matchType!: RuleMatchType;

  @Column({ type: 'text' })
  pattern!: string;

  @Column({ type: 'json', nullable: true })
  methods?: string[] | null;

  @Column({ type: 'json' })
  action!: EdgeAction;

  @Column({ nullable: true })
  upstreamId?: number;

  @ManyToOne(() => HttpResource, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'httpResourceId' })
  httpResource: HttpResource;

  @CreateDateColumn({ name: 'created_at' })
  created_at!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updated_at!: Date;
}
