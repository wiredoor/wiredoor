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
import { NginxManager } from './proxy-server/nginx-manager';
import { DomainsService } from './domains-service';
import { PagedData } from '../repositories/filters/repository-query-filter';

@Service()
export class HttpServicesService {
  constructor(
    @Inject() private readonly httpServiceRepository: HttpServiceRepository,
    @Inject() private readonly httpServiceFilter: HttpServiceQueryFilter,
    @Inject() private readonly domainService: DomainsService,
  ) {}

  public async initialize(): Promise<void> {
    const services = await this.httpServiceRepository.find({
      relations: ['node'],
    });

    for (const service of services) {
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
    const { id } = await this.httpServiceRepository.save({ ...params, nodeId });

    const httpService = await this.getHttpService(id, ['node']);

    await this.buildServerConfig(httpService);

    return httpService;
  }

  public async updateHttpService(
    id: number,
    params: Partial<HttpServiceType>,
  ): Promise<HttpService> {
    const old = await this.getHttpService(id);

    await NginxManager.removeHttpService(old, false);

    await this.httpServiceRepository.save({
      id,
      ...params,
    });

    const httpService = await this.getHttpService(id, ['node']);

    await this.buildServerConfig(httpService, true);

    return httpService;
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

  enableNodeService(id: number, nodeId: number): Promise<HttpService> {
    return this.updateNodeHttpService(id, nodeId, { enabled: true });
  }

  disableService(id: number): Promise<HttpService> {
    return this.updateHttpService(id, { enabled: false });
  }

  disableNodeService(id: number, nodeId: number): Promise<HttpService> {
    return this.updateNodeHttpService(id, nodeId, { enabled: false });
  }

  public async deleteHttpService(id: number): Promise<string> {
    const httpService = await this.getHttpService(id);

    await NginxManager.removeHttpService(httpService);

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
        return {
          status: response.status,
        };
      }
      return;
    } catch (e) {
      console.error(e);
      throw new BadRequestError('Request to backend failed.');
    }
  }

  async buildServerConfig(
    httpService: HttpService,
    restart = true,
  ): Promise<void> {
    if (httpService.domain) {
      await this.domainService.createDomainIfNotExists(httpService.domain);
    }

    await NginxManager.addHttpService(httpService, restart);
  }
}
