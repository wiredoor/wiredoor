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
import { makeTcpServiceData } from './stubs/tcp-service.stub';
import {
  mockCheckPort,
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
import { SSLTermination } from '../../database/models/domain';
import { TcpService } from '../../database/models/tcp-service';
import { PagedData } from '../../repositories/filters/repository-query-filter';
import { faker } from '@faker-js/faker';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let app;
let dataSource: DataSource;

beforeAll(async () => {
  app = await loadApp();
  dataSource = Container.get<DataSource>('dataSource');
});

afterAll(async () => {});

describe('TCP Services Service', () => {
  let repository: TcpServiceRepository;
  let service: TcpServicesService;
  let filter: TcpServiceQueryFilter;

  let node: Node;
  let gateway: Node;
  let nodeRepository: NodeRepository;
  let httpServiceRepository: HttpServiceRepository;
  let patRepository: PersonalAccessTokenRepository;
  let domainRepository: DomainRepository;
  let nodesService: NodesService;
  let httpServicesService: HttpServicesService;
  let patService: PatService;
  let domainService: DomainsService;

  beforeEach(async () => {
    repository = new TcpServiceRepository(dataSource);
    filter = new TcpServiceQueryFilter(repository);

    nodeRepository = new NodeRepository(dataSource);
    httpServiceRepository = new HttpServiceRepository(dataSource);
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
    httpServicesService = new HttpServicesService(
      httpServiceRepository,
      new HttpServiceQueryFilter(httpServiceRepository),
      nodeRepository,
      domainService,
    );
    service = new TcpServicesService(
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
      httpServicesService,
      service,
      patService,
    );

    node = await nodesService.createNode(makeNodeData());
    gateway = await nodesService.createNode(
      makeNodeData({ isGateway: true, gatewayNetwork: '172.8.0.0/24' }),
    );

    jest.clearAllMocks();
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should update server configuration files for all TCP Services when initialize', async () => {
      const serviceData1 = makeTcpServiceData();
      const serviceData2 = makeTcpServiceData();
      const serviceData3 = makeTcpServiceData();
      const serviceData4 = makeTcpServiceData({
        domain: serviceData1.domain,
        backendHost: 'service-name',
      });
      const serviceData5 = makeTcpServiceData({
        domain: serviceData1.domain,
        backendHost: '172.8.0.7',
      });

      await domainService.createDomain({
        domain: serviceData1.domain as string,
        ssl: SSLTermination.SelfSigned,
      });
      await domainService.createDomain({
        domain: serviceData3.domain as string,
        ssl: SSLTermination.SelfSigned,
      });

      jest.clearAllMocks();

      const tcpService1 = await repository.save({
        ...serviceData1,
        port: 15000,
        nodeId: node.id,
      });
      const tcpService2 = await repository.save({
        ...serviceData2,
        port: 15001,
        domain: '',
        proto: 'udp',
        nodeId: node.id,
      });
      const tcpService3 = await repository.save({
        ...serviceData3,
        port: 15002,
        nodeId: node.id,
      });
      const tcpService4 = await repository.save({
        ...serviceData4,
        port: 15003,
        nodeId: gateway.id,
      });
      const tcpService5 = await repository.save({
        ...serviceData5,
        port: 15004,
        nodeId: gateway.id,
      });

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return true;
        }),
      );

      await service.initialize();

      expect(mockSaveToFile.mock.calls).toEqual([
        [
          `/etc/nginx/stream.d/n${node.id}s${tcpService1.id}_stream.conf`,
          expect.stringContaining(` ${tcpService1.domain};`),
        ],
        [
          `/etc/nginx/stream.d/n${node.id}s${tcpService2.id}_stream.conf`,
          expect.stringContaining(` 15001 udp;`),
        ],
        [
          `/etc/nginx/stream.d/n${node.id}s${tcpService3.id}_stream.conf`,
          expect.stringContaining(
            `server ${node.address}:${tcpService3.backendPort}`,
          ),
        ],
        [
          `/etc/nginx/stream.d/n${gateway.id}s${tcpService4.id}_stream.conf`,
          expect.stringContaining(`resolver ${gateway.address}`),
        ],
        [
          `/etc/nginx/stream.d/n${gateway.id}s${tcpService5.id}_stream.conf`,
          expect.stringContaining(
            `server ${tcpService5.backendHost}:${tcpService5.backendPort}`,
          ),
        ],
      ]);
    });
  });

  describe('List TCP Services', () => {
    it('should list all TCP Services for certain node', async () => {
      const serviceData = makeTcpServiceData();
      const tcpService = await repository.save({
        ...serviceData,
        port: faker.number.int({ min: 15000, max: 16000 }),
        nodeId: node.id,
      });

      const result = await service.getNodeTcpServices(node.id, {});

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: serviceData.name }),
        ]),
      );
    });
    it('should list TCP Services paginated for certain node', async () => {
      const serviceData = makeTcpServiceData();
      await repository.save({
        ...serviceData,
        port: faker.number.int({ min: 15000, max: 16000 }),
        nodeId: node.id,
      });

      const result = await service.getNodeTcpServices(node.id, { limit: 1 });

      expect((result as PagedData<TcpService>).data.length).toEqual(1);
    });
  });

  describe('Create TCP Service', () => {
    it('should create TCP Service and save server configuration file', async () => {
      const serviceData = makeTcpServiceData({ ssl: true });

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return false;
        }),
      );

      await domainService.createDomainIfNotExists(serviceData.domain as string);

      const result = await service.createTcpService(node.id, serviceData);

      expect(mockCheckPort).toHaveBeenCalled();

      expect(result.id).toBeDefined();
      expect(result.domain).toEqual(serviceData.domain);

      expect(mockSaveToFile.mock.calls).toEqual([
        [
          `/etc/nginx/conf.d/${serviceData.domain}.conf`,
          expect.stringContaining(` ${serviceData.domain};`),
        ],
        [
          `/etc/nginx/locations/${serviceData.domain}/__main.conf`,
          expect.stringContaining(`root /etc/nginx/default_pages;`),
        ],
        [
          `/etc/nginx/stream.d/n${node.id}s${result.id}_stream.conf`,
          expect.stringContaining(
            ` /etc/nginx/ssl/${serviceData.domain}/privkey.key;`,
          ),
        ],
      ]);

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
    });
    it('should create TCP Service and call certbot', async () => {
      const serviceData = makeTcpServiceData({ ssl: true });

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return true;
        }),
      );

      await domainService.createDomainIfNotExists(serviceData.domain as string);

      const result = await service.createTcpService(node.id, serviceData);

      expect(mockCheckPort).toHaveBeenCalled();

      expect(result.id).toBeDefined();
      expect(result.domain).toEqual(serviceData.domain);

      expect(mockSaveToFile.mock.calls).toEqual([
        [
          `/etc/nginx/conf.d/${serviceData.domain}.conf`,
          expect.stringContaining(` ${serviceData.domain};`),
        ],
        [
          `/etc/nginx/locations/${serviceData.domain}/__main.conf`,
          expect.stringContaining(`root /etc/nginx/default_pages;`),
        ],
        [
          `/etc/nginx/stream.d/n${node.id}s${result.id}_stream.conf`,
          expect.stringContaining(
            ` /etc/letsencrypt/live/${serviceData.domain}/privkey`,
          ),
        ],
      ]);

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
    });
  });

  describe('Update TCP Service', () => {
    it('should update TCP Service and save server configuration file', async () => {
      const serviceData = makeTcpServiceData();

      const created = await service.createTcpService(node.id, serviceData);

      jest.clearAllMocks();

      const update = makeTcpServiceData({
        domain: serviceData.domain,
        proto: 'udp',
        backendPort: 8400,
      });

      const result = await service.updateTcpService(created.id, {
        ...update,
        port: undefined,
      });

      // expect(result.domain).toEqual(update.domain);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/stream.d/n${node.id}s${result.id}_stream.conf`,
        expect.stringContaining(` ${created.port} udp;`),
      );

      expect(mockCLIExec.mock.calls).toEqual([
        ['nginx -t'],
        ['nginx -s reload'],
      ]);
    });
  });

  describe('Disable TCP Service', () => {
    it('should disable TCP Service and remove server configuration file', async () => {
      const serviceData = makeTcpServiceData();

      const created = await service.createTcpService(node.id, serviceData);

      jest.clearAllMocks();

      const result = await service.disableService(created.id);

      expect(result.enabled).toEqual(false);

      expect(mockRemoveFile).toHaveBeenCalledWith(
        expect.stringContaining(`/n${node.id}s${created.id}_stream.conf`),
      );

      expect(mockCLIExec).toHaveBeenCalledWith('nginx -s reload');
    });
  });

  describe('Enable TCP Service', () => {
    it('should enable TCP Service and create server configuration file', async () => {
      const serviceData = makeTcpServiceData();

      const created = await service.createTcpService(node.id, serviceData);

      await service.disableService(created.id);

      jest.clearAllMocks();

      const result = await service.enableService(created.id);

      expect(result.enabled).toEqual(true);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/stream.d/n${node.id}s${result.id}_stream.conf`,
        expect.stringContaining(
          `server ${node.address}:${created.backendPort}`,
        ),
      );

      expect(mockCLIExec.mock.calls).toEqual([
        ['nginx -t'],
        ['nginx -s reload'],
      ]);
    });
  });

  describe('Delete TCP Service', () => {
    it('should delete TCP Service and server config file', async () => {
      const serviceData = makeTcpServiceData();

      mockIsPath.mockImplementation(() => {
        return true;
      });
      const created = await service.createTcpService(node.id, serviceData);

      jest.clearAllMocks();

      await service.deleteTcpService(created.id);

      expect(mockRemoveFile).toHaveBeenCalledWith(
        expect.stringContaining(`/n${node.id}s${created.id}_stream.conf`),
      );

      // if (serviceData.ssl === 'certbot') {
      //   expect(mockCLIExec).toHaveBeenCalledWith(`certbot delete --cert-name ${serviceData.domain} -n`);
      // } else {
      //   expect(mockRemoveDir).toHaveBeenCalledWith(expect.stringContaining(`/${serviceData.domain}`));
      // }

      expect(mockCLIExec).toHaveBeenCalledWith('nginx -s reload');
    });
  });
});
