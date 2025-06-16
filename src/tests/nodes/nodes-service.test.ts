import Container from 'typedi';
import { loadApp } from '../../main';
import { NodeRepository } from '../../repositories/node-repository';
import { NodesService } from '../../services/nodes-service';
import { DataSource } from 'typeorm';
import { HttpServicesService } from '../../services/http-services-service';
import { WgInterfaceRepository } from '../../repositories/wg-interface-repository';
import { HttpServiceRepository } from '../../repositories/http-service-repository';
import { makeNodeData } from './stubs/node.stub';
import WireguardService from '../../services/wireguard/wireguard-service';
import { NodeQueryFilter } from '../../repositories/filters/node-query-filter';
import {
  mockGenPreSharedKey,
  mockGenPrivateKey,
  mockGenPublicKey,
  mockSaveToFile,
  mockSyncConf,
} from '../.jest/global-mocks';
import { NotFoundError } from 'routing-controllers';
import { HttpServiceQueryFilter } from '../../repositories/filters/http-service-query-filter';
import { PatService } from '../../services/pat-service';
import { PersonalAccessTokenRepository } from '../../repositories/personal-access-token-repository';
import { PatQueryFilter } from '../../repositories/filters/pat-query-filter';
import { TcpServicesService } from '../../services/tcp-services-service';
import { TcpServiceRepository } from '../../repositories/tcp-service-repository';
import { TcpServiceQueryFilter } from '../../repositories/filters/tcp-service-query-filter';
import { DomainRepository } from '../../repositories/domain-repository';
import { DomainsService } from '../../services/domains-service';
import { DomainQueryFilter } from '../../repositories/filters/domain-query-filter';
import { PagedData } from '../../repositories/filters/repository-query-filter';
import { NodeInfo } from '../../database/models/node';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let app;
let dataSource: DataSource;

beforeAll(async () => {
  app = await loadApp();
  dataSource = Container.get<DataSource>('dataSource');
});

afterAll(async () => {});

describe('Nodes Service', () => {
  let repository: NodeRepository;
  let service: NodesService;
  let filter: NodeQueryFilter;

  let httpServiceRepository: HttpServiceRepository;
  let tcpServiceRepository: TcpServiceRepository;
  let patRepository: PersonalAccessTokenRepository;
  let domainRepository: DomainRepository;
  let wireguardService: WireguardService;
  let httpServicesService: HttpServicesService;
  let tcpServicesService: TcpServicesService;
  let patService: PatService;
  let domainService: DomainsService;

  beforeEach(async () => {
    repository = new NodeRepository(dataSource);
    filter = new NodeQueryFilter(repository);

    httpServiceRepository = new HttpServiceRepository(dataSource);
    tcpServiceRepository = new TcpServiceRepository(dataSource);
    patRepository = new PersonalAccessTokenRepository(dataSource);
    domainRepository = new DomainRepository(dataSource);

    wireguardService = new WireguardService(
      new WgInterfaceRepository(dataSource),
      repository,
    );
    domainService = new DomainsService(
      domainRepository,
      new DomainQueryFilter(domainRepository),
    );
    httpServicesService = new HttpServicesService(
      httpServiceRepository,
      new HttpServiceQueryFilter(httpServiceRepository),
      repository,
      domainService,
    );
    tcpServicesService = new TcpServicesService(
      tcpServiceRepository,
      new TcpServiceQueryFilter(tcpServiceRepository),
      repository,
      domainService,
    );
    patService = new PatService(
      patRepository,
      new PatQueryFilter(patRepository),
    );

    service = new NodesService(
      repository,
      filter,
      wireguardService,
      httpServicesService,
      tcpServicesService,
      patService,
    );
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('Get Node List', () => {
    it('should get all nodes', async () => {
      const data = makeNodeData();

      await service.createNode(data);

      const result = await service.getNodes({});

      expect((result as NodeInfo[]).length).toBeGreaterThanOrEqual(1);
    });
    it('should get nodes paginated', async () => {
      const data = makeNodeData();

      await service.createNode(data);

      const result = await service.getNodes({ limit: 1 });

      expect((result as PagedData<NodeInfo>).data.length).toEqual(1);
      expect((result as PagedData<NodeInfo>).limit).toEqual(1);
    });
  });

  describe('Create Node', () => {
    it('should create node and update wireguard config', async () => {
      const data = makeNodeData();

      jest.clearAllMocks();

      const result = await service.createNode(data);

      expect(mockGenPublicKey).toHaveBeenCalledTimes(1);
      expect(mockGenPrivateKey).toHaveBeenCalledTimes(1);
      expect(mockGenPreSharedKey).toHaveBeenCalledTimes(1);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/wireguard/wg0.conf`,
        expect.stringContaining(data.name),
        'utf-8',
        0o600,
      );
      expect(mockSyncConf).toHaveBeenCalledTimes(1);

      expect(result.name).toEqual(data.name);
      expect(result.id).toBeDefined();
      expect(result.address).toBeDefined();

      const createdNode = await repository.findOneBy({ id: result.id });

      expect(createdNode?.name).toEqual(data.name);
    });
  });

  // describe('Create Node With PAT', () => {
  //   it('should create node and update wireguard config', async () => {
  //     const data = makeNodeData();

  //     const result = await service.createNodeWithPAT(data);

  //     // expect(mockGenPublicKey).toHaveBeenCalledTimes(1);
  //     // expect(mockGenPrivateKey).toHaveBeenCalledTimes(1);
  //     // expect(mockGenPreSharedKey).toHaveBeenCalledTimes(1);

  //     // expect(mockSaveToFile).toHaveBeenCalledWith(
  //     //   `/etc/wireguard/wg0.conf`,
  //     //   expect.stringContaining(data.name),
  //     //   'utf-8',
  //     //   0o600
  //     // );
  //     // expect(mockSyncConf).toHaveBeenCalledTimes(1);

  //     const pat = result.personalAccessTokens[0] as PersonalAccessTokenWithToken;

  //     expect(result.name).toEqual(data.name);
  //     expect(result.id).toBeDefined();
  //     expect(result.address).toBeDefined();
  //     expect(pat?.token).toBeDefined();

  //     const createdNode = await repository.findOneBy({id: result.id});

  //     expect(createdNode.name).toEqual(data.name);
  //   });
  // });

  describe('Get Node by id', () => {
    it('should get node with given id', async () => {
      const data = makeNodeData();

      const created = await service.createNode(data);

      const result = await service.getNode(created.id);

      expect(result.name).toEqual(data.name);
    });
  });

  describe('Update Node', () => {
    it('should update node and update wireguard config', async () => {
      const data = makeNodeData();

      const created = await service.createNode(data);

      jest.clearAllMocks();

      const update = makeNodeData();

      const result = await service.updateNode(created.id, update);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/wireguard/wg0.conf`,
        expect.stringContaining(update.address as string),
        'utf-8',
        0o600,
      );
      expect(mockSyncConf).toHaveBeenCalledTimes(1);

      expect(result.name).toEqual(update.name);
    });
  });

  describe('Delete Node', () => {
    it('should delete node and update wireguard', async () => {
      const data = makeNodeData();

      const created = await service.createNode(data);

      jest.clearAllMocks();

      await service.deleteNode(created.id);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/wireguard/wg0.conf`,
        expect.any(String),
        'utf-8',
        0o600,
      );
      expect(mockSyncConf).toHaveBeenCalledTimes(1);

      await expect(service.getNode(created.id)).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });
});
