import { Exclude, Expose } from 'class-transformer';
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
  firstName: string;

  @Column()
  lastName: string;

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

  // @Column({
  //   type: 'enum',
  //   enum: USER_ROLES,
  //   default: 'viewer',
  // })
  // role: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
