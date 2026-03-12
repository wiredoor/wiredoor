import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { getTtlFromExpiresAt } from '../../utils/ttl-utils';
import { HttpUpstream } from './http-upstream';
import { HttpAccessRuleEntity } from './http-access-rules';
import { HttpEdgeRuleEntity } from './http-edge-rules';

@Entity('http_resources')
export class HttpResource {
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

  @Column('boolean', {
    default: true,
  })
  enabled: boolean;

  @Column({ type: 'datetime', nullable: true })
  expiresAt?: Date;

  @Column()
  oidcProviderId?: number;

  @Column({ nullable: true, unique: true })
  externalId?: string;

  @OneToMany(() => HttpUpstream, (upstream) => upstream.httpResource)
  httpUpstreams: HttpUpstream[];

  @OneToMany(
    () => HttpAccessRuleEntity,
    (accessRule) => accessRule.httpResource,
  )
  accessRules: HttpAccessRuleEntity[];

  @OneToMany(() => HttpEdgeRuleEntity, (edgeRule) => edgeRule.httpResource)
  edgeRules: HttpEdgeRuleEntity[];

  @CreateDateColumn()
  //@CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  created_at: Date;

  @UpdateDateColumn()
  //@UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  updated_at: Date;

  get ttl(): string | null {
    return getTtlFromExpiresAt(this.expiresAt);
  }
}
