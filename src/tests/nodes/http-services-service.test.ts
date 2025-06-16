import Container from 'typedi';
import { loadApp } from '../../main';
import { DataSource } from 'typeorm';
import { HttpServicesService } from '../../services/http-services-service';
import { HttpServiceRepository } from '../../repositories/http-service-repository';
import { HttpServiceQueryFilter } from '../../repositories/filters/http-service-query-filter';
import { NodeRepository } from '../../repositories/node-repository';
import { NodesService } from '../../services/nodes-service';
import { NodeQueryFilter } from '../../repositories/filters/node-query-filter';
import WireguardService from '../../services/wireguard/wireguard-service';
import { WgInterfaceRepository } from '../../repositories/wg-interface-repository';
import { makeNodeData } from './stubs/node.stub';
import { Node } from '../../database/models/node';
import { makeHttpServiceData } from './stubs/http-service.stub';
import {
  mockCLIExec,
  mockIsPath,
  mockNslookup,
  mockRemoveFile,
  mockSaveToFile,
} from '../.jest/global-mocks';
import { PatService } from '../../services/pat-service';
import { PersonalAccessTokenRepository } from '../../repositories/personal-access-token-repository';
import { PatQueryFilter } from '../../repositories/filters/pat-query-filter';
import { TcpServiceRepository } from '../../repositories/tcp-service-repository';
import { TcpServicesService } from '../../services/tcp-services-service';
import { TcpServiceQueryFilter } from '../../repositories/filters/tcp-service-query-filter';
import { DomainRepository } from '../../repositories/domain-repository';
import { DomainsService } from '../../services/domains-service';
import { DomainQueryFilter } from '../../repositories/filters/domain-query-filter';
import { PagedData } from '../../repositories/filters/repository-query-filter';
import { HttpService } from '../../database/models/http-service';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let app;
let dataSource: DataSource;

beforeAll(async () => {
  app = await loadApp();
  dataSource = Container.get<DataSource>('dataSource');
});

afterAll(async () => {});

describe('HTTP Services Service', () => {
  let repository: HttpServiceRepository;
  let service: HttpServicesService;
  let filter: HttpServiceQueryFilter;

  let node: Node;
  let nodeRepository: NodeRepository;
  let tcpServiceRepository: TcpServiceRepository;
  let patRepository: PersonalAccessTokenRepository;
  let domainRepository: DomainRepository;
  let nodesService: NodesService;
  let tcpServicesService: TcpServicesService;
  let patService: PatService;
  let domainService: DomainsService;

  beforeEach(async () => {
    repository = new HttpServiceRepository(dataSource);
    filter = new HttpServiceQueryFilter(repository);

    nodeRepository = new NodeRepository(dataSource);
    tcpServiceRepository = new TcpServiceRepository(dataSource);
    patRepository = new PersonalAccessTokenRepository(dataSource);
    domainRepository = new DomainRepository(dataSource);

    patService = new PatService(
      patRepository,
      new PatQueryFilter(patRepository),
    );
    domainService = new DomainsService(
      domainRepository,
      new DomainQueryFilter(domainRepository),
    );
    tcpServicesService = new TcpServicesService(
      tcpServiceRepository,
      new TcpServiceQueryFilter(tcpServiceRepository),
      nodeRepository,
      domainService,
    );
    service = new HttpServicesService(
      repository,
      filter,
      nodeRepository,
      domainService,
    );

    nodesService = new NodesService(
      nodeRepository,
      new NodeQueryFilter(nodeRepository),
      new WireguardService(
        new WgInterfaceRepository(dataSource),
        nodeRepository,
      ),
      service,
      tcpServicesService,
      patService,
    );

    node = await nodesService.createNode(makeNodeData());

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await repository.clear();
    await nodeRepository.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should update server configuration files for all HTTP Services when initialize', async () => {
      const serviceData1 = makeHttpServiceData({ backendPort: 80 });
      const serviceData2 = makeHttpServiceData({ backendPort: 81 });
      const serviceData3 = makeHttpServiceData({ backendPort: 82 });

      const httpService1 = await repository.save({
        ...serviceData1,
        nodeId: node.id,
      });
      const httpService2 = await repository.save({
        ...serviceData2,
        domain: '',
        pathLocation: '/custom',
        nodeId: node.id,
      });
      const httpService3 = await repository.save({
        ...serviceData3,
        pathLocation: '/path/to/location',
        nodeId: node.id,
      });

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return true;
        }),
      );

      await service.initialize();

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/conf.d/${serviceData1.domain}.conf`,
        expect.stringContaining(` ${httpService1.domain};`),
      );
      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/locations/${serviceData1.domain}/__main.conf`,
        expect.stringContaining(
          `${serviceData1.backendProto}://$node${node.id}service${httpService1.id}:${serviceData1.backendPort}`,
        ),
      );
      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/locations/default/custom.conf`,
        expect.stringContaining(
          `${serviceData2.backendProto}://$node${node.id}service${httpService2.id}:${serviceData2.backendPort}`,
        ),
      );
      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/conf.d/${serviceData3.domain}.conf`,
        expect.stringContaining(` ${httpService3.domain};`),
      );
      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/locations/${serviceData3.domain}/path-to-location.conf`,
        expect.stringContaining(
          `${serviceData3.backendProto}://$node${node.id}service${httpService3.id}:${serviceData3.backendPort}`,
        ),
      );
    });
  });

  describe('List HTTP Services', () => {
    it('should list all HTTP Services for certain node', async () => {
      const serviceData = makeHttpServiceData();
      const httpService = await repository.save({
        ...serviceData,
        nodeId: node.id,
      });

      const result = await service.getNodeHttpServices(node.id, {});

      expect((result as HttpService[]).length).toEqual(1);
      expect(result[0].name).toEqual(httpService.name);
    });
    it('should list HTTP Services paginated for certain node', async () => {
      const serviceData = makeHttpServiceData();
      await repository.save({
        ...serviceData,
        nodeId: node.id,
      });

      const result = await service.getNodeHttpServices(node.id, { limit: 1 });

      expect((result as PagedData<HttpService>).data.length).toEqual(1);
    });
  });

  describe('Create HTTP Service', () => {
    it('should create HTTP Service and save server configuration file', async () => {
      const serviceData = makeHttpServiceData();

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return false;
        }),
      );

      const result = await service.createHttpService(node.id, serviceData);

      expect(result.id).toBeDefined();
      expect(result.domain).toEqual(serviceData.domain);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/conf.d/${serviceData.domain}.conf`,
        expect.stringContaining(` ${serviceData.domain};`),
      );

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`openssl.*${serviceData.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        [
          expect.stringMatching(
            new RegExp(`openssl.*${serviceData.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        [
          expect.stringMatching(
            new RegExp(`openssl.*${serviceData.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/locations/${serviceData.domain}/__main.conf`,
        expect.stringContaining(
          `${serviceData.backendProto}://$node${node.id}service${result.id}:${serviceData.backendPort}`,
        ),
      );
    });
    it('should create HTTP Service and call certbot', async () => {
      const serviceData = makeHttpServiceData();

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return true;
        }),
      );

      const result = await service.createHttpService(node.id, serviceData);

      expect(result.id).toBeDefined();
      expect(result.domain).toEqual(serviceData.domain);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/conf.d/${serviceData.domain}.conf`,
        expect.stringContaining(` ${serviceData.domain};`),
      );

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`certbot.*${serviceData.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/locations/${serviceData.domain}/__main.conf`,
        expect.stringContaining(
          `${serviceData.backendProto}://$node${node.id}service${result.id}:${serviceData.backendPort}`,
        ),
      );
    });
  });

  describe('Update HTTP Service', () => {
    it('should update HTTP Service and save server configuration file', async () => {
      const serviceData = makeHttpServiceData();

      const created = await service.createHttpService(node.id, serviceData);

      jest.clearAllMocks();

      const update = makeHttpServiceData({
        backendProto: 'https',
        backendPort: 443,
      });

      const result = await service.updateHttpService(created.id, update);

      expect(result.domain).toEqual(update.domain);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/conf.d/${update.domain}.conf`,
        expect.stringContaining(` ${update.domain};`),
      );

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`certbot.*${update.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);
    });
  });

  describe('Disable HTTP Service', () => {
    it('should disable HTTP Service and remove server configuration file', async () => {
      const serviceData = makeHttpServiceData();

      const created = await service.createHttpService(node.id, serviceData);

      jest.clearAllMocks();

      const result = await service.disableService(created.id);

      expect(result.enabled).toEqual(false);

      expect(mockRemoveFile).toHaveBeenCalledWith(
        expect.stringContaining('__main.conf'),
      );

      expect(mockCLIExec.mock.calls).toEqual([['nginx -s reload']]);
    });
  });

  describe('Enable HTTP Service', () => {
    it('should enable HTTP Service and create server configuration file', async () => {
      const serviceData = makeHttpServiceData();

      const created = await service.createHttpService(node.id, serviceData);

      await service.disableService(created.id);

      jest.clearAllMocks();

      const result = await service.enableService(created.id);

      expect(result.enabled).toEqual(true);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/locations/${serviceData.domain}/__main.conf`,
        expect.stringContaining(
          `${serviceData.backendProto}://$node${node.id}service${result.id}:${serviceData.backendPort}`,
        ),
      );

      expect(mockCLIExec.mock.calls).toEqual([
        ['nginx -t'],
        ['nginx -s reload'],
      ]);
    });
  });

  describe('Delete HTTP Service', () => {
    it('should delete HTTP Service and server config file', async () => {
      const serviceData = makeHttpServiceData();

      mockIsPath.mockImplementation(() => {
        return true;
      });
      const created = await service.createHttpService(node.id, serviceData);

      jest.clearAllMocks();

      await service.deleteHttpService(created.id);

      let transformed = serviceData.pathLocation?.replace(/^\//, '');

      if (!transformed) {
        transformed = '__main';
      } else {
        transformed = transformed.replace(/\//g, '-');
      }

      expect(mockRemoveFile).toHaveBeenCalledWith(
        expect.stringContaining(
          `locations/${serviceData.domain}/${transformed}.conf`,
        ),
      );

      expect(mockCLIExec).toHaveBeenCalledWith('nginx -s reload');
    });
  });

  describe('Ping HTTP Backend Service', () => {
    it('should request backend service', async () => {
      const serviceData = makeHttpServiceData();

      const created = await service.createHttpService(node.id, serviceData);

      jest.clearAllMocks();

      const result = await service.pingHttpServiceBackend(created.id);

      expect(result?.status).toEqual(200);
    });
  });
});
