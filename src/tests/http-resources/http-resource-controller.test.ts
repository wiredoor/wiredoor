import supertest from 'supertest';
import { loadApp } from '../../main';
import Container from 'typedi';
import { DataSource } from 'typeorm';
import TestAgent from 'supertest/lib/agent';
import config from '../../config';

import { NodeRepository } from '../../repositories/node-repository';
import { NodesService } from '../../services/nodes-service';
import { NodeQueryFilter } from '../../repositories/filters/node-query-filter';
import WireguardService from '../../services/wireguard/wireguard-service';
import { WgInterfaceRepository } from '../../repositories/wg-interface-repository';
import { NodeApiKeyRepository } from '../../repositories/node-api-key-repository';
import { HttpServicesService } from '../../services/http-services-service';
import { HttpServiceRepository } from '../../repositories/http-service-repository';
import { HttpServiceQueryFilter } from '../../repositories/filters/http-service-query-filter';
import { TcpServicesService } from '../../services/tcp-services-service';
import { TcpServiceRepository } from '../../repositories/tcp-service-repository';
import { TcpServiceQueryFilter } from '../../repositories/filters/tcp-service-query-filter';
import { DomainRepository } from '../../repositories/domain-repository';
import { DomainsService } from '../../services/domains-service';
import { DomainQueryFilter } from '../../repositories/filters/domain-query-filter';
import { NginxDomainResource } from '../../services/proxy-server/nginx-domain-resource';

import { Node } from '../../database/models/node';

import { makeNodeData } from '../nodes/stubs/node.stub';
import {
  makeHttpResourceData,
  makeHttpUpstreamData,
  makeAccessRuleData,
  makeEdgeRuleData,
} from './stubs/http-resource.stub';

import { faker } from '@faker-js/faker';

import {
  mockNslookup,
  mockSaveToFile,
  mockRemoveFile,
  mockIsPath,
} from '../.jest/global-mocks';
import ServerUtils from '../../utils/server';
import { HttpResourceType } from '../../schemas/http-resource-schemas';

let app: any;
let request: TestAgent;
let cookie: string;
let dataSource: DataSource;
let nodesService: NodesService;
let node: Node;
let gatewayNode: Node;

beforeAll(async () => {
  app = await loadApp();
  dataSource = Container.get<DataSource>('dataSource');

  request = supertest.agent(app);

  const res = await supertest(app).post('/api/auth/web/login').send({
    username: 'admin@example.com',
    password: 'admin',
  });

  expect(res.status).toBe(200);

  const setCookie = res.headers['set-cookie'] as unknown as
    | string[]
    | undefined;
  if (!setCookie) throw new Error('No Set-Cookie header returned');

  const sidCookie = setCookie.find((c) =>
    c.startsWith(`${config.session.name}=`),
  );
  if (!sidCookie) throw new Error('sid cookie not found in Set-Cookie');

  cookie = sidCookie.split(';')[0];

  // Create test nodes
  const nodeRepository = new NodeRepository(dataSource);
  const domainRepository = new DomainRepository(dataSource);
  const domainsService = new DomainsService(
    domainRepository,
    new DomainQueryFilter(domainRepository),
    Container.get(NginxDomainResource),
  );
  const httpServiceRepository = new HttpServiceRepository(dataSource);
  const tcpServiceRepository = new TcpServiceRepository(dataSource);
  const nodeApiKeyRepository = new NodeApiKeyRepository(dataSource);

  nodesService = new NodesService(
    nodeRepository,
    new NodeQueryFilter(nodeRepository),
    new WireguardService(new WgInterfaceRepository(dataSource), nodeRepository),
    new HttpServicesService(
      httpServiceRepository,
      new HttpServiceQueryFilter(httpServiceRepository),
      nodeRepository,
      domainsService,
    ),
    new TcpServicesService(
      tcpServiceRepository,
      new TcpServiceQueryFilter(tcpServiceRepository),
      nodeRepository,
      domainsService,
    ),
    nodeApiKeyRepository,
  );

  node = await nodesService.createNode(makeNodeData());
  gatewayNode = await nodesService.createNode(
    makeNodeData({
      isGateway: true,
      gatewayNetworks: [{ interface: 'eth0', network: '172.16.0.0/24' }],
    }),
  );
}, 15000);

afterAll(async () => {});

function authPost(path: string, body: any) {
  return request.post(path).set('Cookie', cookie).send(body);
}

function authGet(path: string) {
  return request.get(path).set('Cookie', cookie);
}

function authPatch(path: string, body: any) {
  return request.patch(path).set('Cookie', cookie).send(body);
}

function authDelete(path: string) {
  return request.delete(path).set('Cookie', cookie);
}

function buildCreatePayload(
  overrides: Partial<HttpResourceType> = {},
): HttpResourceType {
  const data = makeHttpResourceData({
    httpUpstreams: overrides.httpUpstreams ?? [
      makeHttpUpstreamData({ targetNodeId: node.id }),
    ],
    accessRules: overrides.accessRules ?? [],
    edgeRules: overrides.edgeRules ?? [],
    ...overrides,
  });

  return data;
}

describe('HTTP Resource Controller', () => {
  describe('HTTP Resource API - Authentication', () => {
    it('should reject unauthenticated on GET /api/http', async () => {
      const res = await request.get('/api/http');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated on POST /api/http', async () => {
      const res = await request.post('/api/http').send({});
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated on GET /api/http/:id', async () => {
      const res = await request.get('/api/http/1');
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated on PATCH /api/http/:id', async () => {
      const res = await request.patch('/api/http/1').send({});
      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated on DELETE /api/http/:id', async () => {
      const res = await request.delete('/api/http/1');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/http', () => {
    it('should list http resources', async () => {
      const payload = buildCreatePayload();
      await authPost('/api/http', payload);

      const res = await authGet('/api/http?limit=10');

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: payload.name,
            domain: payload.domain,
          }),
        ]),
      );
    });

    it('should list http resources paginated', async () => {
      await authPost('/api/http', buildCreatePayload());
      await authPost('/api/http', buildCreatePayload());

      const res = await authGet('/api/http?limit=1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('POST /api/http', () => {
    it('should create http resource with upstreams', async () => {
      const payload = buildCreatePayload();

      const res = await authPost('/api/http', payload);

      expect(res.status).toBe(200);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(payload.name);
      expect(res.body.domain).toBe(payload.domain);
      expect(res.body.enabled).toBe(true);
      expect(res.body.httpUpstreams).toHaveLength(1);
      expect(res.body.httpUpstreams[0].targetPort).toBe(
        payload.httpUpstreams?.[0]?.targetPort,
      );
    });

    it('should create http resource with multiple upstreams', async () => {
      const payload = buildCreatePayload({
        httpUpstreams: [
          makeHttpUpstreamData({
            pathPattern: '/',
            targetHost: 'web-container',
            targetPort: 3000,
          }),
          makeHttpUpstreamData({
            pathPattern: '/api',
            targetNodeId: node.id,
            targetPort: 8080,
          }),
        ],
      });

      const res = await authPost('/api/http', payload);

      expect(res.status).toBe(200);
      expect(res.body.httpUpstreams).toHaveLength(2);
      expect(res.body.httpUpstreams[1].targetNodeId).toBe(node.id);
    });

    it('should create http resource with access rules', async () => {
      const payload = buildCreatePayload({
        accessRules: [
          makeAccessRuleData({
            when: { type: 'prefix', pathPattern: '/' },
            action: 'public',
            order: 1000,
          }),
          makeAccessRuleData({
            when: { type: 'prefix', pathPattern: '/admin' },
            action: 'require_auth',
            order: 100,
          }),
        ],
      });

      const res = await authPost('/api/http', payload);

      expect(res.status).toBe(200);
      expect(res.body.accessRules).toHaveLength(2);
    });

    it('should create http resource with edge rules', async () => {
      const cidr = faker.internet.ipv4() + '/24';

      const payload = buildCreatePayload({
        edgeRules: [
          makeEdgeRuleData({
            when: { type: 'prefix', pathPattern: '/api' },
            action: {
              type: 'ip.deny',
              params: { cidrs: [cidr] },
            },
            order: 10,
          }),
          makeEdgeRuleData({
            when: { type: 'prefix', pathPattern: '/api' },
            action: {
              type: 'rate_limit.req',
              params: {
                zone: 'api_limit',
                rate: '10r/s',
                burst: 20,
                nodelay: true,
                status: 429,
              },
            },
            order: 20,
          }),
        ],
      });

      const res = await authPost('/api/http', payload);

      expect(res.status).toBe(200);
      expect(res.body.edgeRules).toHaveLength(2);
    });

    it('should create http resource with gateway node and hostname target', async () => {
      const payload = buildCreatePayload({
        httpUpstreams: [
          makeHttpUpstreamData({
            pathPattern: '/',
            targetNodeId: gatewayNode.id,
            targetHost: 'my-internal-service',
            targetPort: 3000,
          }),
        ],
      });

      const res = await authPost('/api/http', payload);

      expect(res.status).toBe(200);
      expect(res.body.httpUpstreams[0].targetHost).toBe('my-internal-service');
      expect(res.body.httpUpstreams[0].targetNodeId).toBe(gatewayNode.id);
    });

    it('should generate nginx config files on create', async () => {
      jest.clearAllMocks();
      mockNslookup.mockImplementation(() => false);
      jest.spyOn(ServerUtils, 'verifyDomainHttp01').mockResolvedValue(true);

      const payload = buildCreatePayload();

      const res = await authPost('/api/http', payload);

      expect(res.status).toBe(200);

      // Should have written server conf + location conf
      expect(mockSaveToFile).toHaveBeenCalledWith(
        expect.stringContaining(payload.domain as string),
        expect.any(String),
      );
    });

    it('should not expose sensitive fields in response', async () => {
      const payload = buildCreatePayload();

      const res = await authPost('/api/http', payload);

      expect(res.status).toBe(200);
      // Should not leak internal node details
      expect(res.body.httpUpstreams[0]).not.toHaveProperty('node.privateKey');
      expect(res.body.httpUpstreams[0]).not.toHaveProperty('node.preSharedKey');
    });
  });

  describe('GET /api/http/:id', () => {
    it('should get http resource by id with all relations', async () => {
      const payload = buildCreatePayload({
        accessRules: [makeAccessRuleData()],
        edgeRules: [makeEdgeRuleData()],
      });

      const created = await authPost('/api/http', payload);

      const res = await authGet(`/api/http/${created.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.name).toBe(payload.name);
      expect(res.body.domain).toBe(payload.domain);
      expect(res.body.httpUpstreams).toHaveLength(1);
      expect(res.body.accessRules).toHaveLength(1);
      expect(res.body.edgeRules).toHaveLength(1);
    });

    it('should return 404 for non-existent resource', async () => {
      const res = await authGet('/api/http/99999');

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/http/:id', () => {
    it('should update http resource name and domain', async () => {
      const payload = buildCreatePayload();
      const created = await authPost('/api/http', payload);
      jest.clearAllMocks();

      const newDomain = `updated-${faker.string.alphanumeric(6)}.example.com`;
      const updatePayload = buildCreatePayload({
        name: 'Updated Resource',
        domain: newDomain,
      });

      const res = await authPatch(
        `/api/http/${created.body.id}`,
        updatePayload,
      );

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Resource');
      expect(res.body.domain).toBe(newDomain);
    });

    it('should update upstreams — add new, keep existing, remove old', async () => {
      const payload = buildCreatePayload({
        httpUpstreams: [
          makeHttpUpstreamData({
            pathPattern: '/',
            targetNodeId: node.id,
            targetPort: 3000,
          }),
          makeHttpUpstreamData({
            pathPattern: '/api',
            targetNodeId: node.id,
            targetPort: 8080,
          }),
        ],
      });

      const created = await authPost('/api/http', payload);
      expect(created.body.httpUpstreams).toHaveLength(2);
      jest.clearAllMocks();

      // Keep root, remove /api, add /ws
      const updatePayload = buildCreatePayload({
        name: created.body.name,
        domain: created.body.domain,
        httpUpstreams: [
          makeHttpUpstreamData({
            pathPattern: '/',
            targetNodeId: node.id,
            targetPort: 3000,
          }),
          makeHttpUpstreamData({
            pathPattern: '/ws',
            targetNodeId: node.id,
            targetPort: 9000,
          }),
        ],
      });

      const res = await authPatch(
        `/api/http/${created.body.id}`,
        updatePayload,
      );

      expect(res.status).toBe(200);
      expect(res.body.httpUpstreams).toHaveLength(2);
      expect(
        res.body.httpUpstreams.map((u: any) => u.pathPattern).sort(),
      ).toEqual(['/', '/ws']);
    });

    it('should update upstream port', async () => {
      const payload = buildCreatePayload();
      const created = await authPost('/api/http', payload);
      jest.clearAllMocks();

      const updatePayload = buildCreatePayload({
        name: created.body.name,
        domain: created.body.domain,
        httpUpstreams: [
          makeHttpUpstreamData({
            pathPattern: '/',
            targetNodeId: node.id,
            targetPort: 9999,
          }),
        ],
      });

      const res = await authPatch(
        `/api/http/${created.body.id}`,
        updatePayload,
      );

      expect(res.status).toBe(200);
      expect(res.body.httpUpstreams[0].targetPort).toBe(9999);
    });

    it('should rebuild nginx config on update', async () => {
      const payload = buildCreatePayload();
      const created = await authPost('/api/http', payload);
      jest.clearAllMocks();

      const updatePayload = buildCreatePayload({
        name: created.body.name,
        domain: created.body.domain,
      });

      await authPatch(`/api/http/${created.body.id}`, updatePayload);

      expect(mockSaveToFile).toHaveBeenCalled();
    });

    it('should return 404 for non-existent resource', async () => {
      const updatePayload = buildCreatePayload();

      const res = await authPatch('/api/http/99999', updatePayload);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/http/:id', () => {
    it('should delete http resource', async () => {
      const payload = buildCreatePayload();
      const created = await authPost('/api/http', payload);
      jest.clearAllMocks();

      mockIsPath.mockImplementation(() => true);

      const res = await authDelete(`/api/http/${created.body.id}`);

      expect(res.status).toBe(200);

      // Verify it's gone
      const check = await authGet(`/api/http/${created.body.id}`);
      expect(check.status).toBe(404);
    });

    it('should clean up nginx config on delete', async () => {
      const payload = buildCreatePayload();
      const created = await authPost('/api/http', payload);
      jest.clearAllMocks();

      mockIsPath.mockImplementation(() => true);

      await authDelete(`/api/http/${created.body.id}`);

      expect(mockRemoveFile).toHaveBeenCalled();
    });
  });

  describe('HTTP Resource API - Validation', () => {
    it('should reject POST with empty body', async () => {
      const res = await authPost('/api/http', {});

      expect(res.status).toBe(422);
    });

    it('should reject POST without name', async () => {
      const payload = buildCreatePayload();

      const { name, ...rest } = payload;
      void name;

      const res = await authPost('/api/http', rest);

      expect(res.status).toBe(422);
    });

    it('should reject POST with invalid upstream port', async () => {
      const payload = buildCreatePayload({
        httpUpstreams: [
          makeHttpUpstreamData({ targetNodeId: node.id, targetPort: 99999 }),
        ],
      });

      const res = await authPost('/api/http', payload);

      expect(res.status).toBe(422);
    });
  });
});
