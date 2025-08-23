import { Exclude } from 'class-transformer';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryColumn()
  id: string;

  @Column()
  userId: number;

  @Exclude()
  @Column()
  token: string;

  @Column()
  ip: string;

  @Column()
  userAgent: string;

  @Column({
    nullable: true,
  })
  expireAt: Date;

  @Column({
    nullable: true,
  })
  revokedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
