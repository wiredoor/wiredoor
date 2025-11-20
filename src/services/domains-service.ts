import Container, { Inject, Service } from 'typedi';
import { DomainRepository } from '../repositories/domain-repository';
import {
  Domain,
  Oauth2ProxyConfig,
  SSLTermination,
} from '../database/models/domain';
import { DomainQueryFilter } from '../repositories/filters/domain-query-filter';
import {
  DomainFilterQueryParams,
  DomainType,
  pointToThisServer,
} from '../validators/domain-validator';
import { SSLManager } from './proxy-server/ssl-manager';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import { PagedData } from '../repositories/filters/repository-query-filter';
import { ValidationError } from '../utils/errors/validation-error';
import { ProcessManager } from './oauth2-proxy/process-manager';
import config from '../config';
import { HttpServicesService } from './http-services-service';
import { NginxDomainService } from './proxy-server/nginx-domain-service';

@Service()
export class DomainsService {
  private nginxDomainService: NginxDomainService;

  constructor(
    @Inject() private readonly domainRepository: DomainRepository,
    @Inject() private readonly domainFilter: DomainQueryFilter,
  ) {
    this.nginxDomainService = new NginxDomainService();
  }

  public async initialize(): Promise<void> {
    const domains = await this.domainRepository.find();

    for (const domain of domains) {
      await this.buildServerConfig(domain, false);
    }

    await ProcessManager.restart();
  }

  public async getAll(): Promise<Domain[]> {
    return this.domainRepository.find();
  }

  public async getDomains(
    filters: DomainFilterQueryParams,
  ): Promise<Domain | Domain[] | PagedData<Domain>> {
    return this.domainFilter.apply(filters);
  }

  public async createDomain(
    params: DomainType,
    restart = true,
  ): Promise<Domain> {
    let oauth2ServicePort = null;
    let oauth2Config: Oauth2ProxyConfig = null;

    if (params.authentication) {
      this.checkAuthConfig();
      oauth2ServicePort = await this.domainRepository.getAvailablePort();
      oauth2Config = {
        allowedEmails: params.allowedEmails,
      };
    }

    const sslCerts = await SSLManager.getSSLCertificates(
      params.domain,
      params.ssl as SSLTermination,
    );

    const domain = await this.domainRepository.save({
      ...params,
      sslPair: sslCerts,
      oauth2ServicePort,
      oauth2Config,
    });

    await this.buildServerConfig(domain, restart);

    return domain;
  }

  public async createDomainIfNotExists(domain: string): Promise<Domain> {
    const instance = await this.domainRepository.getDomainByName(domain);

    if (instance) {
      return instance;
    }

    const resolveThisServer = await pointToThisServer(domain);

    return this.createDomain(
      {
        domain,
        ssl: resolveThisServer
          ? SSLTermination.Certbot
          : SSLTermination.SelfSigned,
      },
      false,
    );
  }

  public async getDomain(id: number): Promise<Domain> {
    const domain = await this.domainRepository.findOne({ where: { id } });

    if (!domain) {
      throw new NotFoundError('Domain not found!');
    }

    return domain;
  }

  public async updateDomain(
    id: number,
    params: Partial<DomainType>,
  ): Promise<Domain> {
    const old = await this.getDomain(id);

    if (params.domain && params.domain !== old.domain) {
      throw new ValidationError({
        body: [
          {
            field: 'domain',
            message:
              "Domain names can't be changed. Add a new one and delete this one instead.",
          },
        ],
      });
    }

    let sslPair = old.sslPair;

    if (old.ssl !== params.ssl || old.domain !== params.domain) {
      sslPair = await SSLManager.getSSLCertificates(
        params.domain,
        params.ssl as SSLTermination,
      );
    }

    let oauth2ServicePort = null;
    let oauth2Config: Oauth2ProxyConfig = null;

    if (params.authentication) {
      this.checkAuthConfig();
      if (!old.oauth2ServicePort) {
        oauth2ServicePort = await this.domainRepository.getAvailablePort();
      } else {
        oauth2ServicePort = old.oauth2ServicePort;
      }
      oauth2Config = {
        allowedEmails: params.allowedEmails,
      };
    } else if (old.oauth2ServicePort) {
      await Container.get(HttpServicesService).removeAuthFromServices(
        old.domain,
      );
      await ProcessManager.removeOauthProcess(old);
    }

    await this.domainRepository.save({
      id,
      ...params,
      sslPair,
      oauth2ServicePort,
      oauth2Config,
    });

    const domain = await this.getDomain(id);

    await this.buildServerConfig(domain);

    return domain;
  }

  public async deleteDomain(id: number): Promise<string> {
    const domain = await this.getDomain(id);

    if (domain.oauth2ServicePort) {
      await ProcessManager.removeOauthProcess(domain);
    }

    await this.nginxDomainService.remove(domain);

    await this.domainRepository.delete(id);

    return 'Deleted!';
  }

  public async buildServerConfig(
    domain: Domain,
    restart = true,
  ): Promise<void> {
    if (!domain.sslPair && domain.ssl) {
      domain.sslPair = await SSLManager.getSSLCertificates(
        domain.domain,
        domain.ssl as SSLTermination,
      );

      await this.domainRepository.save(domain);
    }

    if (domain.oauth2ServicePort) {
      await ProcessManager.addOauthProcess(domain, restart);
    }

    await this.nginxDomainService.create(domain, restart);
  }

  private checkAuthConfig(): void {
    if (
      !config.oauth2.provider ||
      !config.oauth2.clientId ||
      !config.oauth2.clientSecret
    ) {
      throw new BadRequestError(
        'OAuth2 authentication cannot be enabled: required environment variables are missing. Please define OAUTH2_PROXY_PROVIDER, OAUTH2_PROXY_CLIENT_ID, and OAUTH2_PROXY_CLIENT_SECRET in your .env file and restart the server.',
      );
    }
  }
}
