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
import {
  HttpPredicateV1,
  RuleAction,
  RuleMatchType,
} from '../../schemas/http-resource-schemas';
import { HttpResource } from './http-resource';

@Entity('http_access_rules')
@Index(['httpResourceId', 'enabled'])
@Index(['httpResourceId', 'matchType'])
@Index(['httpResourceId', 'order'])
export class HttpAccessRuleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  httpResourceId: number;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({ type: 'integer', default: 1000 })
  order!: number;

  @Column({ name: 'match_type', type: 'text' })
  matchType!: RuleMatchType; // exact | prefix | regex

  @Column({ type: 'text' })
  pattern!: string;

  @Column({ type: 'json', nullable: true })
  methods?: string[] | null; // ["GET","POST"]

  @Column({ type: 'text' })
  action!: RuleAction;

  @Column({ type: 'json', nullable: true })
  predicate?: HttpPredicateV1 | null;

  @Column({ nullable: true })
  upstreamId?: number;

  @Column({ type: 'integer', default: 1 })
  rev!: number;

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
