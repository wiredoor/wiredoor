import Joi from 'joi';
import { Inject, Service } from 'typedi';
import { UsersService } from './users-service';
import { clearInitTokenFile, generateInitTokenFile } from '../utils/init-token';
import { createLogger, ILogger } from '../logger';
import { resolveVpnHost } from '../utils/vpn-host';

@Service()
export class BootstrapService {
  private readonly logger: ILogger;

  constructor(@Inject() private readonly usersService: UsersService) {
    this.logger = createLogger({ serviceName: 'bootstrap' });
  }

  async initialize(): Promise<void> {
    await this.bootstrapAdmin();
    await this.discoverPublicVpnHost();
  }

  async bootstrapAdmin(): Promise<void> {
    // Bootstrap logic here
    const userCount = await this.usersService.getCount();

    if (userCount > 0) {
      await clearInitTokenFile();
      return;
    }

    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = (process.env.ADMIN_PASSWORD || '').trim();

    const { error, value } = Joi.string()
      .email()
      .required()
      .validate(adminEmail);
    void value;

    if (adminEmail && !error && adminPassword) {
      await this.usersService.registerAdmin(
        {
          email: adminEmail,
          password: adminPassword,
          name: 'Administrator',
        },
        true,
      );
      this.logger.info('===============================================');
      this.logger.info('Admin created automatically via ENV variables:');
      this.logger.info(`ADMIN_EMAIL: ${adminEmail}`);
      this.logger.info('ADMIN_PASSWORD: (hidden for security reasons)');
      this.logger.info('You must change the password at first login.');
      this.logger.info('===============================================');
      await clearInitTokenFile();
      return;
    }

    const { path, expiresAt } = await generateInitTokenFile(15);

    this.logger.info('===============================================');
    this.logger.info('WireDoor Admin User Setup Token Generated');
    this.logger.info(`Token expires at: ${expiresAt.toISOString()}`);
    this.logger.info(
      `You can retrieve user setup token running: docker compose exec wiredoor cat ${path}`,
    );
    this.logger.info(
      'If your token expires before completing the setup, restart the service to generate a new one.',
    );
    this.logger.info('===============================================');
  }

  async discoverPublicVpnHost(): Promise<string> {
    const host = await resolveVpnHost();

    this.logger.info('===============================================');
    this.logger.info('VPN Host Discovered');
    this.logger.info(`VPN_HOST: ${host.host} (source: ${host.source})`);
    this.logger.info('You can override it setting the VPN_HOST env variable.');
    this.logger.info('===============================================');

    return host.host;
  }
}
