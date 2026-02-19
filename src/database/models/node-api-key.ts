import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Node } from './node';
import { randomUUID } from 'node:crypto';

@Entity('node_api_keys')
@Index('uq_node_api_keys_token_hash', ['tokenHash'], { unique: true })
@Index('ix_node_api_keys_node_id', ['nodeId'])
@Index('ix_node_api_keys_revoked_expires', ['revokedAt', 'expiresAt'])
export class NodeApiKey {
  @PrimaryColumn('uuid')
  id!: string;

  @BeforeInsert()
  setId(): void {
    if (!this.id) this.id = randomUUID();
  }

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column()
  nodeId!: number;

  @ManyToOne(() => Node, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'nodeId' })
  node!: Node;

  // HMAC-SHA256 hex (64 chars)
  @Column({ type: 'varchar', length: 64 })
  tokenHash!: string;

  @Column({
    nullable: true,
  })
  expiresAt!: Date | null;

  @Column({
    nullable: true,
  })
  revokedAt!: Date | null;

  @Column({
    nullable: true,
  })
  lastUsedAt!: Date | null;

  @CreateDateColumn()
  //@CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  created_at: Date;

  @UpdateDateColumn()
  //@UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  updated_at: Date;
}
