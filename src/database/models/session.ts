import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ name: 'sid_hash', type: 'text' })
  sidHash!: string;

  @Index()
  @Column({ name: 'user_id', type: 'integer' })
  userId!: number;

  @Column({ name: 'remember_me', type: 'boolean', default: false })
  rememberMe!: boolean;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'datetime', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'last_seen_at', type: 'datetime', nullable: true })
  lastSeenAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  ip!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'device_id', type: 'text', nullable: true })
  deviceId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
