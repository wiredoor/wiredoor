import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
// import { USER_ROLES } from '../../utils/constants';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  name: string;

  @Exclude()
  @Column()
  password: string;

  @Column({
    default: true,
  })
  active: boolean;

  @Column({
    default: false,
  })
  isAdmin: boolean;

  @Column({
    default: true,
  })
  totpEnabled: boolean;

  @Exclude()
  @Column({
    nullable: true,
  })
  totpSecret: string;

  @Column({ default: false })
  mustChangePassword!: boolean;

  // @Column({
  //   type: 'enum',
  //   enum: USER_ROLES,
  //   default: 'viewer',
  // })
  // role: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
