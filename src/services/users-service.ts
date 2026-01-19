import { Inject, Service } from 'typedi';
import { UserRepository } from '../repositories/user-repository';
import { User } from '../database/models/user';
import bcrypt from 'bcrypt';

@Service()
export class UsersService {
  constructor(@Inject() private readonly userRepository: UserRepository) {}

  async getCount(): Promise<number> {
    return this.userRepository.count();
  }

  async findById(userId: number): Promise<User | null> {
    return this.userRepository.findOneBy({ id: userId });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email: email.trim().toLowerCase() });
  }

  async registerAdmin(
    userData: {
      email: string;
      password: string;
      name: string;
    },
    mustChangePassword = false,
  ): Promise<User> {
    const hashedPassword = this.hashPassword(userData.password);
    const user = this.userRepository.create({
      name: userData.name.trim(),
      email: userData.email.trim().toLowerCase(),
      password: hashedPassword,
      mustChangePassword,
      active: true,
    });
    return this.userRepository.save(user);
  }

  async changePassword(
    email: string,
    newPassword: string,
    mustChangePassword = false,
  ): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user) throw new Error(`User not found with email: ${email}`);

    user.password = this.hashPassword(newPassword);
    user.mustChangePassword = mustChangePassword;

    return this.userRepository.save(user);
  }

  async validateCredentials(
    username: string,
    password: string,
  ): Promise<User | null> {
    const user = await this.findByEmail(username);

    if (!user || !user.active) return null;

    const verified = await this.verifyPassword(password, user.password);

    if (!verified) return null;

    return user;
  }

  private async verifyPassword(
    plain: string,
    stored: string,
  ): Promise<boolean> {
    const isPasswordValid = await bcrypt.compare(plain, stored);
    return isPasswordValid;
  }

  private hashPassword(plain: string): string {
    return bcrypt.hashSync(plain, 10);
  }
}
