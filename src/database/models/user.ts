import { Exclude, Expose } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './role';

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

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToMany(() => Role, (r) => r.users, { cascade: false })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  roles: Role[];

  @Expose()
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
}
