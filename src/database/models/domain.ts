import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  Oauth2ProxyConfig,
  SSLCerts,
  SSLTermination,
} from '../../schemas/domain-schemas';

@Entity('domains')
export class Domain {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({
    length: 40,
  })
  domain: string;

  @Column({
    default: SSLTermination.SelfSigned,
  })
  ssl: string;

  @Exclude()
  @Column('simple-json', {
    nullable: true,
  })
  sslPair: SSLCerts;

  @Column({
    default: false,
  })
  skipValidation: boolean;

  @Exclude()
  @Column({
    nullable: true,
    unique: true,
  })
  oauth2ServicePort: number;

  @Exclude()
  @Column({
    type: 'json',
    nullable: true,
  })
  oauth2Config: Oauth2ProxyConfig;

  @CreateDateColumn()
  //@CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  created_at: Date;

  @UpdateDateColumn()
  //@UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  updated_at: Date;

  @Expose()
  get authentication(): boolean {
    return !!this.oauth2ServicePort;
  }

  @Expose()
  get allowedEmails(): string[] {
    return this.oauth2Config?.allowedEmails || null;
  }
}
