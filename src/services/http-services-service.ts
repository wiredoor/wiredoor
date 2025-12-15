import { Inject, Service } from 'typedi';
import { HttpServiceRepository } from '../repositories/http-service-repository';
import { HttpService } from '../database/models/http-service';
import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';
import { BadRequestError, NotFoundError } from 'routing-controllers';
import {
  HttpServiceFilterQueryParams,
  HttpServiceType,
} from '../validators/http-service-validator';
import { HttpServiceQueryFilter } from '../repositories/filters/http-service-query-filter';
import { DomainsService } from './domains-service';
import { PagedData } from '../repositories/filters/repository-query-filter';
import { BaseServices } from './base-services';
import { NodeRepository } from '../repositories/node-repository';
import { calculateExpiresAtFromTTL } from '../utils/ttl-utils';
import { NginxHttpService } from './proxy-server/nginx-http-service';
import { Logger } from '../logger';

@Service()
export class HttpServicesService extends BaseServices {
  private nginxHttpService: NginxHttpService;

  constructor(
    @Inject() private readonly httpServiceRepository: HttpServiceRepository,
    @Inject() private readonly httpServiceFilter: HttpServiceQueryFilter,
    @Inject() private readonly nodeRepository: NodeRepository,
    @Inject() private readonly domainService: DomainsService,
  ) {
    super(nodeRepository, domainService);
    this.nginxHttpService = new NginxHttpService();
  }

  public async initialize(): Promise<void> {
    const services = await this.httpServiceRepository.find({
      relations: ['node'],
    });

    for (const service of services) {
      await this.checkOrCreateDomain(service.domain);
      await this.buildServerConfig(service, false);
    }
  }

  public async getHttpServices(
    params: HttpServiceFilterQueryParams,
  ): Promise<HttpService | HttpService[] | PagedData<HttpService>> {
    return this.httpServiceFilter.apply(params);
  }

  public async getNodeHttpServices(
    nodeId: number,
    params: HttpServiceFilterQueryParams,
  ): Promise<HttpService | HttpService[] | PagedData<HttpService>> {
    return this.httpServiceFilter.apply({ ...params, nodeId });
  }

  public async getHttpService(
    id: number,
    relations: string[] = [],
  ): Promise<HttpService> {
    return this.httpServiceRepository.findOne({
      where: { id },
      relations,
    });
  }

  public async getNodeHttpService(
    id: number,
    nodeId: number,
    relations: string[] = [],
  ): Promise<HttpService> {
    const service = await this.httpServiceRepository.findOne({
      where: { id, nodeId },
      relations,
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    return service;
  }

  public async createHttpService(
    nodeId: number,
    params: HttpServiceType,
  ): Promise<HttpService> {
    await Promise.all([
      this.checkNodePort(
        nodeId,
        params.backendPort,
        params.backendHost,
        params.backendProto === 'https',
      ),
      this.checkOrCreateDomain(params.domain),
    ]);

    const expiresAt = calculateExpiresAtFromTTL(params.ttl);

    const { id } = await this.httpServiceRepository.save({
      ...params,
      nodeId,
      expiresAt,
    });

    const httpService = await this.getHttpService(id, ['node']);

    await this.buildServerConfig(httpService);

    return httpService;
  }

  public async updateHttpService(
    id: number,
    params: Partial<HttpServiceType>,
  ): Promise<HttpService> {
    const old = await this.getHttpService(id, ['node']);

    if (old.node.isLocal && old.backendHost === '127.0.0.1') {
      params = {
        domain: params.domain,
        allowedIps: params.allowedIps,
        blockedIps: params.blockedIps,
        requireAuth: params.requireAuth,
      };
    }

    if (params.backendHost && params.backendPort) {
      await this.checkNodePort(
        old.nodeId,
        params.backendPort,
        params.backendHost,
        params.backendProto === 'https',
      );
    }

    await this.checkOrCreateDomain(params.domain);

    await this.nginxHttpService.remove(old, false);

    await this.httpServiceRepository.save({
      id,
      ...params,
    });

    const httpService = await this.getHttpService(id, ['node']);

    await this.buildServerConfig(httpService, true);

    return httpService;
  }

  public async removeAuthFromServices(domain: string): Promise<void> {
    const services = await this.httpServiceRepository.find({
      where: { domain, requireAuth: true },
      relations: ['node'],
    });

    for (const service of services) {
      service.requireAuth = false;
    }

    const updated = await this.httpServiceRepository.save(services);

    for (const service of updated) {
      await this.buildServerConfig(service, false);
    }
  }

  public async updateNodeHttpService(
    id: number,
    nodeId: number,
    params: Partial<HttpServiceType>,
  ): Promise<HttpService> {
    await this.getNodeHttpService(id, nodeId);

    return this.updateHttpService(id, params);
  }

  enableService(id: number): Promise<HttpService> {
    return this.updateHttpService(id, { enabled: true });
  }

  enableNodeService(
    id: number,
    nodeId: number,
    ttl = null,
  ): Promise<HttpService> {
    const expiresAt = calculateExpiresAtFromTTL(ttl);

    return this.updateNodeHttpService(id, nodeId, { enabled: true, expiresAt });
  }

  async disableService(id: number): Promise<HttpService> {
    return this.updateHttpService(id, {
      enabled: false,
      expiresAt: null,
    });
  }

  disableNodeService(id: number, nodeId: number): Promise<HttpService> {
    return this.updateNodeHttpService(id, nodeId, {
      enabled: false,
      expiresAt: null,
    });
  }

  public async deleteHttpService(id: number): Promise<string> {
    const httpService = await this.getHttpService(id, ['node']);

    if (httpService.node.isLocal && httpService.backendHost === '127.0.0.1') {
      throw new BadRequestError(`Wiredoor APP can't be deleted`);
    }

    await this.nginxHttpService.remove(httpService);

    await this.httpServiceRepository.delete(id);

    return 'Deleted!';
  }

  public async pingHttpServiceBackend(
    id: number,
    reqPath: string = '/',
  ): Promise<{ status: number }> {
    const httpService = await this.getHttpService(id, ['node']);

    let options: AxiosRequestConfig = {
      timeout: 3000,
    };

    if (httpService.backendProto === 'https') {
      options = Object.assign(options, {
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
        }),
      });
    }

    const backendUrl = new URL(
      reqPath,
      `${httpService.backendProto}://${httpService.node.address}:${httpService.backendPort}`,
    );

    try {
      const response = await axios.get(backendUrl.href, options);

      if (response.status >= 200 && response.status < 400) {
        Logger.info('Ping to HTTP Backend Service Succeeded', {
          nodeName: httpService.node.name,
          serviceName: httpService.name,
          url: backendUrl.href,
          status: response.status,
        });
        return {
          status: response.status,
        };
      }
      return;
    } catch (e: Error | any) {
      Logger.warn('Ping to HTTP Backend Service Failed', e);
      throw new BadRequestError('Request to backend failed.');
    }
  }

  async buildServerConfig(
    httpService: HttpService,
    restart = true,
  ): Promise<void> {
    await this.nginxHttpService.create(httpService, restart);
  }
}
