import Container from 'typedi';
import { loadApp } from '../../main';
import { DataSource } from 'typeorm';
import { HttpResourceService } from '../../services/http-resources/http-resource-service';
import { HttpResourceRepository } from '../../repositories/http-resource-repository';
import { HttpUpstreamRepository } from '../../repositories/http-upstream-repository';
import { HttpAccessRuleRepository } from '../../repositories/http-access-rule-repository';
import { HttpEdgeRuleRepository } from '../../repositories/http-edge-rule-repository';
import { HttpResourceQueryFilter } from '../../repositories/filters/http-resource-query-filter';
import { DomainRepository } from '../../repositories/domain-repository';
import { DomainsService } from '../../services/domains-service';
import { DomainQueryFilter } from '../../repositories/filters/domain-query-filter';
import { NodeRepository } from '../../repositories/node-repository';
import { NodesService } from '../../services/nodes-service';
import { NodeQueryFilter } from '../../repositories/filters/node-query-filter';
import WireguardService from '../../services/wireguard/wireguard-service';
import { WgInterfaceRepository } from '../../repositories/wg-interface-repository';
import { NodeApiKeyRepository } from '../../repositories/node-api-key-repository';
import { HttpServicesService } from '../../services/http-services-service';
import { HttpServiceRepository } from '../../repositories/http-service-repository';
import { HttpServiceQueryFilter } from '../../repositories/filters/http-service-query-filter';
import { TcpServiceRepository } from '../../repositories/tcp-service-repository';
import { TcpServicesService } from '../../services/tcp-services-service';
import { TcpServiceQueryFilter } from '../../repositories/filters/tcp-service-query-filter';
import { NginxDomainResource } from '../../services/proxy-server/nginx-domain-resource';
import { NginxHttpResource } from '../../services/proxy-server/nginx-http-resource';

import { makeNodeData } from '../nodes/stubs/node.stub';
import {
  makeHttpResourceData,
  makeHttpUpstreamData,
  makeAccessRuleData,
  makeEdgeRuleData,
} from './stubs/http-resource.stub';

import { Node } from '../../database/models/node';
import { HttpResource } from '../../database/models/http-resource';
import { PagedData } from '../../schemas/shared-schemas';

import {
  mockCLIExec,
  mockIsPath,
  mockNslookup,
  mockRemoveFile,
  mockSaveToFile,
} from '../.jest/global-mocks';
import ServerUtils from '../../utils/server';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let app;
let dataSource: DataSource;

beforeAll(async () => {
  app = await loadApp();
  dataSource = Container.get<DataSource>('dataSource');
}, 15000);

afterAll(async () => {}, 10000);

describe('HTTP Resource Service', () => {
  let httpResourceRepository: HttpResourceRepository;
  let httpUpstreamRepository: HttpUpstreamRepository;
  let httpAccessRuleRepository: HttpAccessRuleRepository;
  let httpEdgeRuleRepository: HttpEdgeRuleRepository;
  let httpResourceFilter: HttpResourceQueryFilter;
  let domainRepository: DomainRepository;
  let nodeRepository: NodeRepository;
  let nodeApiKeyRepository: NodeApiKeyRepository;
  let tcpServiceRepository: TcpServiceRepository;
  let httpServiceRepository: HttpServiceRepository;
  let wgInterfaceRepository: WgInterfaceRepository;

  let domainsService: DomainsService;
  let nodesService: NodesService;
  let httpServicesService: HttpServicesService;
  let tcpServicesService: TcpServicesService;
  let nginxHttpResource: NginxHttpResource;
  let service: HttpResourceService;

  let node: Node;
  let gatewayNode: Node;

  beforeEach(async () => {
    // Initialize repositories
    httpResourceRepository = new HttpResourceRepository(dataSource);
    httpUpstreamRepository = new HttpUpstreamRepository(dataSource);
    httpAccessRuleRepository = new HttpAccessRuleRepository(dataSource);
    httpEdgeRuleRepository = new HttpEdgeRuleRepository(dataSource);
    httpResourceFilter = new HttpResourceQueryFilter(httpResourceRepository);

    domainRepository = new DomainRepository(dataSource);
    nodeRepository = new NodeRepository(dataSource);
    nodeApiKeyRepository = new NodeApiKeyRepository(dataSource);
    tcpServiceRepository = new TcpServiceRepository(dataSource);
    httpServiceRepository = new HttpServiceRepository(dataSource);
    wgInterfaceRepository = new WgInterfaceRepository(dataSource);

    // Initialize supporting services
    domainsService = new DomainsService(
      domainRepository,
      new DomainQueryFilter(domainRepository),
      Container.get(NginxDomainResource),
    );

    httpServicesService = new HttpServicesService(
      httpServiceRepository,
      new HttpServiceQueryFilter(httpServiceRepository),
      nodeRepository,
      domainsService,
    );

    tcpServicesService = new TcpServicesService(
      tcpServiceRepository,
      new TcpServiceQueryFilter(tcpServiceRepository),
      nodeRepository,
      domainsService,
    );

    nodesService = new NodesService(
      nodeRepository,
      new NodeQueryFilter(nodeRepository),
      new WireguardService(wgInterfaceRepository, nodeRepository),
      httpServicesService,
      tcpServicesService,
      nodeApiKeyRepository,
    );

    nginxHttpResource = Container.get(NginxHttpResource);

    // Initialize main service under test
    service = new HttpResourceService(
      httpResourceRepository,
      httpUpstreamRepository,
      httpAccessRuleRepository,
      httpEdgeRuleRepository,
      domainsService,
      httpResourceFilter,
      nginxHttpResource,
    );

    // Create test node
    node = await nodesService.createNode(makeNodeData());
    gatewayNode = await nodesService.createNode(
      makeNodeData({
        isGateway: true,
        gatewayNetworks: [{ interface: 'eth0', network: '172.16.0.0/24' }],
      }),
    );

    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up test data
    if (httpResourceRepository && httpResourceRepository.clear) {
      try {
        await httpResourceRepository.clear();
      } catch (error) {
        console.warn('Failed to clear httpResourceRepository:', error);
      }
    }
    if (domainRepository && domainRepository.clear) {
      try {
        await domainRepository.clear();
      } catch (error) {
        console.warn('Failed to clear domainRepository:', error);
      }
    }
    if (nodeRepository && nodeRepository.clear) {
      try {
        await nodeRepository.clear();
      } catch (error) {
        console.warn('Failed to clear nodeRepository:', error);
      }
    }
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize HTTP resources and create nginx configuration files', async () => {
      const resourceData1 = makeHttpResourceData({
        domain: 'test1.example.com',
      });
      const resourceData2 = makeHttpResourceData({
        domain: 'test2.example.com',
      });

      // Create resources directly in database
      const resource1 = await httpResourceRepository.save({
        name: resourceData1.name,
        domain: resourceData1.domain,
        enabled: resourceData1.enabled,
        expiresAt: resourceData1.expiresAt,
        oidcProviderId: resourceData1.oidcProviderId,
      });
      const resource2 = await httpResourceRepository.save({
        name: resourceData2.name,
        domain: resourceData2.domain,
        enabled: resourceData2.enabled,
        expiresAt: resourceData2.expiresAt,
        oidcProviderId: resourceData2.oidcProviderId,
      });

      // Create upstreams
      const upstreamData1 = makeHttpUpstreamData({
        targetPort: 80,
        targetNodeId: node.id,
      });
      const upstreamData2 = makeHttpUpstreamData({
        targetPort: 81,
        targetNodeId: node.id,
      });

      await httpUpstreamRepository.save({
        ...upstreamData1,
        httpResourceId: resource1.id,
        targetNodeId: node.id,
      });

      await httpUpstreamRepository.save({
        ...upstreamData2,
        httpResourceId: resource2.id,
        targetNodeId: node.id,
      });

      mockNslookup.mockImplementation(() => true);

      await service.initialize();

      expect(mockSaveToFile).toHaveBeenCalledTimes(4);

      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/conf.d/${resource1.domain}.conf`,
        expect.stringContaining(` ${resource1.domain};`),
      );
      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/conf.d/${resource2.domain}.conf`,
        expect.stringContaining(` ${resource2.domain};`),
      );
      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/locations/${resource1.domain}/__main.conf`,
        expect.stringContaining(
          `${node.address}`,
          // `${upstreamData1.targetProtocol}://$target_${upstreamData1.id}:${upstreamData1.targetPort}`,
        ),
      );
      expect(mockSaveToFile).toHaveBeenCalledWith(
        `/etc/nginx/locations/${resource2.domain}/__main.conf`,
        expect.stringContaining(
          `${node.address}`,
          // `${upstreamData2.targetProtocol}://$target_${upstreamData2.id}:${upstreamData2.targetPort}`,
        ),
      );
    });
  });

  describe('List HTTP Resources', () => {
    it('should list all HTTP Resources', async () => {
      const resourceData = makeHttpResourceData();
      const httpResource = await httpResourceRepository.save({
        name: resourceData.name,
        domain: resourceData.domain,
        enabled: resourceData.enabled,
        expiresAt: resourceData.expiresAt,
        oidcProviderId: resourceData.oidcProviderId,
      });

      const result = await service.getHttpResources({});

      // When no pagination is provided, it might return an array directly
      if (Array.isArray(result)) {
        expect(result.length).toEqual(1);
        expect(result[0].name).toEqual(httpResource.name);
      } else {
        expect((result as PagedData<HttpResource>).data.length).toEqual(1);
        expect((result as PagedData<HttpResource>).data[0].name).toEqual(
          httpResource.name,
        );
      }
    });

    it('should list HTTP Resources paginated', async () => {
      const resourceData = makeHttpResourceData();
      await httpResourceRepository.save({
        name: resourceData.name,
        domain: resourceData.domain,
        enabled: resourceData.enabled,
        expiresAt: resourceData.expiresAt,
        oidcProviderId: resourceData.oidcProviderId,
      });

      const result = await service.getHttpResources({ limit: 1 });

      expect((result as PagedData<HttpResource>).data.length).toEqual(1);
    });
  });

  describe('Get HTTP Resource', () => {
    it('should get a single HTTP Resource by id', async () => {
      const resourceData = makeHttpResourceData();

      const created = await service.createHttpResource({
        name: resourceData.name,
        domain: resourceData.domain,
        enabled: resourceData.enabled,
        expiresAt: resourceData.expiresAt,
        oidcProviderId: resourceData.oidcProviderId,
        httpUpstreams: [
          makeHttpUpstreamData({ pathPattern: '/', targetHost: 'ui' }),
          makeHttpUpstreamData({ pathPattern: '/api', targetNodeId: node.id }),
        ],
        accessRules: [makeAccessRuleData()],
        edgeRules: [makeEdgeRuleData()],
      });

      const result = await service.getHttpResource(created.id);

      expect(result.id).toEqual(created.id);
      expect(result.name).toEqual(resourceData.name);
      expect(result.domain).toEqual(resourceData.domain);
      expect(result.httpUpstreams).toHaveLength(2);
      expect(result.accessRules).toHaveLength(1);
      expect(result.edgeRules).toHaveLength(1);
      expect(result.httpUpstreams?.[1].node.id).toEqual(node.id);
    });
  });

  describe('Create HTTP Resource', () => {
    // it('should create HTTP Resource without domain', async () => {
    //   const resourceData = makeHttpResourceData({ domain: undefined });
    //   // Override any domain that might have been generated
    //   delete resourceData.domain;

    //   const result = await service.createHttpResource(resourceData);

    //   expect(result.id).toBeDefined();
    //   expect(result.name).toEqual(resourceData.name);
    //   expect(result.domain).toBeFalsy(); // Could be null or undefined
    // });
    it('should create HTTP Resource with upstreams, access rules and edge rules and save nginx config', async () => {
      const accessRuleData = makeAccessRuleData();
      const edgeRuleData = makeEdgeRuleData();

      const resourceData = makeHttpResourceData({
        httpUpstreams: [
          makeHttpUpstreamData({ pathPattern: '/', targetHost: 'ui' }),
          makeHttpUpstreamData({ pathPattern: '/api', targetNodeId: node.id }),
        ],
        accessRules: [accessRuleData],
        edgeRules: [edgeRuleData],
      });

      mockNslookup.mockImplementation(() => false);
      jest.spyOn(ServerUtils, 'verifyDomainHttp01').mockResolvedValue(true);

      const result = await service.createHttpResource(resourceData);

      const expectedSaveToFileCalls = [
        {
          path: `/etc/nginx/conf.d/${resourceData.domain}.conf`,
          lines: [
            `server_name\\s+${resourceData.domain};`,
            `include\\s+partials/wiredoor_access.conf;`,
            `include\\s+locations/${resourceData.domain}/\\*.conf;`,
          ],
        },
        {
          path: `/etc/nginx/locations/${resourceData.domain}/__main.conf`,
          lines: [
            `location / {`,
            `set \\$target_${result.httpUpstreams?.[0].id}\\s+ui`,
            `proxy_pass\\s+${result.httpUpstreams?.[0].targetProtocol}://\\$target_${result.httpUpstreams?.[0].id}:${result.httpUpstreams?.[0].targetPort};`,
            `location /api {`,
            `set \\$target_${result.httpUpstreams?.[1].id}\\s+${node.address}`,
            `proxy_pass\\s+${result.httpUpstreams?.[1].targetProtocol}://\\$target_${result.httpUpstreams?.[1].id}:${result.httpUpstreams?.[1].targetPort};`,
          ],
        },
      ];

      expect(mockSaveToFile).toHaveBeenCalledTimes(
        expectedSaveToFileCalls.length,
      );

      expectedSaveToFileCalls.forEach(({ path, lines }, index) => {
        const [calledPath, fileContent] = mockSaveToFile.mock.calls[index];

        expect(calledPath).toBe(path);
        expect(fileContent).toEqual(expect.any(String));

        lines.forEach((line) => {
          expect(fileContent).toMatch(new RegExp(line));
        });
      });

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(
              `certbot.*${resourceData.domain?.replace('.', '\\.')}.*`,
            ),
          ),
        ],
        ['nginx -t'],
        ['nginx -s reload'],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);

      expect(result.id).toBeDefined();
      expect(result.name).toEqual(resourceData.name);
      expect(result.domain).toEqual(resourceData.domain);
      expect(result.httpUpstreams).toHaveLength(2);
      expect(result.accessRules).toHaveLength(1);
      expect(result.edgeRules).toHaveLength(1);
    });

    it('should create HTTP Resource and generate self-signed certificate if unresolved domain', async () => {
      const resourceData = makeHttpResourceData({
        httpUpstreams: [makeHttpUpstreamData({ targetNodeId: node.id })],
      });

      mockNslookup.mockImplementation(() => false);
      jest.spyOn(ServerUtils, 'verifyDomainHttp01').mockResolvedValue(false);

      const result = await service.createHttpResource(resourceData);

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(
              `openssl.*${resourceData.domain?.replace('.', '\\.')}.*`,
            ),
          ),
        ],
        [
          expect.stringMatching(
            new RegExp(
              `openssl.*${resourceData.domain?.replace('.', '\\.')}.*`,
            ),
          ),
        ],
        [
          expect.stringMatching(
            new RegExp(
              `openssl.*${resourceData.domain?.replace('.', '\\.')}.*`,
            ),
          ),
        ],
        ['nginx -t'],
        ['nginx -s reload'],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);

      expect(result.id).toBeDefined();
      expect(result.domain).toEqual(resourceData.domain);
    });

    it('should create HTTP resource and expose many upstreams through gateway node', async () => {
      const accessRuleData = makeAccessRuleData();
      const edgeRuleData = makeEdgeRuleData();

      const resourceData = makeHttpResourceData({
        httpUpstreams: [
          makeHttpUpstreamData({
            pathPattern: '/',
            targetNodeId: gatewayNode.id,
            targetHost: 'ui',
          }),
          makeHttpUpstreamData({
            pathPattern: '/api',
            targetNodeId: gatewayNode.id,
            targetHost: 'api',
          }),
        ],
        accessRules: [accessRuleData],
        edgeRules: [edgeRuleData],
      });

      mockNslookup.mockImplementation(() => true);

      const result = await service.createHttpResource(resourceData);

      const expectedSaveToFileCalls = [
        {
          path: `/etc/nginx/conf.d/${resourceData.domain}.conf`,
          lines: [
            `server_name\\s+${resourceData.domain};`,
            `include\\s+partials/wiredoor_access.conf;`,
            `include\\s+locations/${resourceData.domain}/\\*.conf;`,
          ],
        },
        {
          path: `/etc/nginx/locations/${resourceData.domain}/__main.conf`,
          lines: [
            `resolver\\s+${gatewayNode.address}`,
            `location / {`,
            `set \\$target_${result.httpUpstreams?.[0].id}\\s+ui`,
            `proxy_pass\\s+${result.httpUpstreams?.[0].targetProtocol}://\\$target_${result.httpUpstreams?.[0].id}:${result.httpUpstreams?.[0].targetPort};`,
            `location /api {`,
            `set \\$target_${result.httpUpstreams?.[1].id}\\s+api`,
            `proxy_pass\\s+${result.httpUpstreams?.[1].targetProtocol}://\\$target_${result.httpUpstreams?.[1].id}:${result.httpUpstreams?.[1].targetPort};`,
          ],
        },
      ];

      expect(mockSaveToFile).toHaveBeenCalledTimes(
        expectedSaveToFileCalls.length,
      );

      expectedSaveToFileCalls.forEach(({ path, lines }, index) => {
        const [calledPath, fileContent] = mockSaveToFile.mock.calls[index];

        expect(calledPath).toBe(path);
        expect(fileContent).toEqual(expect.any(String));

        lines.forEach((line) => {
          expect(fileContent).toMatch(new RegExp(line));
        });
      });

      expect(result.id).toBeDefined();
      expect(result.name).toEqual(resourceData.name);
      expect(result.domain).toEqual(resourceData.domain);
      expect(result.httpUpstreams).toHaveLength(2);
      expect(result.accessRules).toHaveLength(1);
      expect(result.edgeRules).toHaveLength(1);
    });
  });

  describe('Update HTTP Resource', () => {
    it('should update HTTP Resource and its related entities', async () => {
      const originalResourceData = makeHttpResourceData({
        httpUpstreams: [
          makeHttpUpstreamData({ pathPattern: '/', targetHost: 'ui' }),
          makeHttpUpstreamData({ pathPattern: '/api', targetNodeId: node.id }),
        ],
        accessRules: [makeAccessRuleData()],
        edgeRules: [makeEdgeRuleData()],
      });

      const created = await service.createHttpResource(originalResourceData);
      jest.clearAllMocks();

      const updatedUpstream = makeHttpUpstreamData({
        targetNodeId: node.id,
        targetPort: 8080,
      });
      const updateData = makeHttpResourceData({
        name: 'Updated Resource',
        domain: 'updated.example.com',
        httpUpstreams: [updatedUpstream],
        accessRules: [makeAccessRuleData()],
        edgeRules: [makeEdgeRuleData()],
      });

      const result = await service.updateHttpResource(created.id, updateData);

      const expectedSaveToFileCalls = [
        {
          path: `/etc/nginx/conf.d/${updateData.domain}.conf`,
          lines: [
            `server_name\\s+${updateData.domain};`,
            `include\\s+partials/wiredoor_access.conf;`,
            `include\\s+locations/${updateData.domain}/\\*.conf;`,
          ],
        },
        {
          path: `/etc/nginx/locations/${updateData.domain}/__main.conf`,
          lines: [
            `location / {`,
            `set \\$target_${result.httpUpstreams?.[0].id}\\s+${node.address}`,
            `proxy_pass\\s+${result.httpUpstreams?.[0].targetProtocol}://\\$target_${result.httpUpstreams?.[0].id}:${result.httpUpstreams?.[0].targetPort};`,
          ],
        },
      ];

      expect(mockSaveToFile).toHaveBeenCalledTimes(
        expectedSaveToFileCalls.length,
      );

      expectedSaveToFileCalls.forEach(({ path, lines }, index) => {
        const [calledPath, fileContent] = mockSaveToFile.mock.calls[index];

        expect(calledPath).toBe(path);
        expect(fileContent).toEqual(expect.any(String));

        lines.forEach((line) => {
          expect(fileContent).toMatch(new RegExp(line));
        });
      });

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`certbot.*${updateData.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        ['nginx -s reload'],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);

      expect(result.name).toEqual(updateData.name);
      expect(result.domain).toEqual(updateData.domain);
      expect(result.httpUpstreams?.[0]?.targetPort).toEqual(8080);
    });
  });

  describe('Delete HTTP Resource', () => {
    it('should delete HTTP Resource and clean up nginx configuration', async () => {
      const resourceData = makeHttpResourceData({
        httpUpstreams: [makeHttpUpstreamData({ targetNodeId: node.id })],
      });

      const created = await service.createHttpResource(resourceData);
      jest.clearAllMocks();

      mockIsPath.mockImplementation(() => true);

      const result = await service.deleteHttpResource(created.id);

      expect(result).toEqual('Deleted!');
      expect(mockRemoveFile).toHaveBeenCalled();

      // Verify resource is deleted from database
      const deletedResource = await httpResourceRepository.findOne({
        where: { id: created.id },
      });
      expect(deletedResource).toBeNull();
    });
  });

  describe('Declarative API', () => {
    it('should create declarative resource', async () => {
      const declarativeInput = {
        name: 'TestResource',
        domain: 'declarative.example.com',
        enabled: true,
        httpUpstreams: [makeHttpUpstreamData({ targetNodeId: node.id })],
        accessRules: [makeAccessRuleData()],
        edgeRules: [makeEdgeRuleData()],
      };

      const result = await service.createDeclarativeResource(declarativeInput);

      expect(result.name).toEqual(declarativeInput.name);
      expect(result.domain).toEqual(declarativeInput.domain);
    });

    it('should plan declarative resource changes', async () => {
      const declarativeInput = {
        name: 'TestResource',
        domain: 'declarative.example.com',
        enabled: true,
        httpUpstreams: [],
        accessRules: [],
        edgeRules: [],
      };

      const created = await service.createDeclarativeResource(declarativeInput);

      const updatedInput = {
        ...declarativeInput,
        name: 'Updated Test Resource',
      };

      const plan = await service.planDeclarativeResource(
        created.id,
        updatedInput,
      );

      expect(plan).toBeDefined();
    });

    it('should apply declarative resource changes', async () => {
      const declarativeInput = {
        name: 'TestResource',
        domain: 'declarative.example.com',
        enabled: true,
        httpUpstreams: [],
        accessRules: [],
        edgeRules: [],
      };

      const created = await service.createDeclarativeResource(declarativeInput);

      const updatedInput = {
        ...declarativeInput,
        name: 'Updated Test Resource',
      };

      const result = await service.applyDeclarativeResource(
        created.id,
        updatedInput,
      );

      expect(result).toBeDefined();

      const updated = await service.getHttpResource(created.id);
      expect(updated.name).toEqual('Updated Test Resource');
    });
  });

  describe('Export HTTP Resource', () => {
    it('should export HTTP Resource to manifest format', async () => {
      const resourceData = makeHttpResourceData({
        httpUpstreams: [makeHttpUpstreamData({ targetNodeId: node.id })],
        accessRules: [makeAccessRuleData()],
        edgeRules: [makeEdgeRuleData()],
      });

      const created = await service.createHttpResource(resourceData);
      const resource = await service.getHttpResource(created.id);

      const nodeExtIdById = new Map([[node.id, 'node-1']]);
      const providerExtIdById = new Map();

      const manifest = service.exportHttpResource(
        resource,
        nodeExtIdById,
        providerExtIdById,
      );

      expect(manifest.name).toEqual(resource.name);
      expect(manifest.domain).toEqual(resource.domain);
      expect(manifest.upstreams).toHaveLength(1);
      expect(manifest.accessRules).toHaveLength(1);
      expect(manifest.edgeRules).toHaveLength(1);
    });

    it('should export HTTP Resource with OIDC provider reference', async () => {
      const resourceData = makeHttpResourceData({ oidcProviderId: 1 });
      const created = await service.createHttpResource(resourceData);
      const resource = await service.getHttpResource(created.id);

      const nodeExtIdById = new Map();
      const providerExtIdById = new Map([[1, 'provider-1']]);

      const manifest = service.exportHttpResource(
        resource,
        nodeExtIdById,
        providerExtIdById,
      );

      expect(manifest.providerRef).toEqual('provider-1');
    });
  });
});
