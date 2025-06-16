import Container from 'typedi';
import { loadApp } from '../../main';
import { DataSource } from 'typeorm';
import { NodeRepository } from '../../repositories/node-repository';
import { makeNodeData } from './stubs/node.stub';
import { Node } from '../../database/models/node';
import { PersonalAccessTokenRepository } from '../../repositories/personal-access-token-repository';
import { PatService } from '../../services/pat-service';
import { makePATData } from './stubs/pat.stub';
import { PatQueryFilter } from '../../repositories/filters/pat-query-filter';
import { PersonalAccessToken } from '../../database/models/personal-access-token';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let app;
let dataSource: DataSource;

beforeAll(async () => {
  app = await loadApp();
  dataSource = Container.get<DataSource>('dataSource');
});

afterAll(async () => {});

describe('Personal Access Token Service', () => {
  let repository: PersonalAccessTokenRepository;
  let service: PatService;
  let filter: PatQueryFilter;

  let node: Node;
  let nodeRepository: NodeRepository;

  beforeEach(async () => {
    repository = new PersonalAccessTokenRepository(dataSource);
    filter = new PatQueryFilter(repository);

    nodeRepository = new NodeRepository(dataSource);

    service = new PatService(repository, filter);

    node = await nodeRepository.save({
      ...makeNodeData(),
      preSharedKey: 'secret',
      publicKey: 'secret',
      privateKey: 'secret',
    });

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await repository.clear();
    // await nodeRepository.clear();
    jest.clearAllMocks();
  });

  describe('List Personal Access Token for given Node', () => {
    it('should list all PAT for certain node', async () => {
      const patData = makePATData();
      const pat = await repository.save({ ...patData, nodeId: node.id });

      const result = await service.getPATs(node.id, {});

      expect((result as PersonalAccessToken[]).length).toEqual(1);
      expect(result[0].name).toEqual(pat.name);
    });
  });

  describe('Get PAT', () => {
    it('should retrieve PAT by ID', async () => {
      const patData = makePATData();
      const pat = await repository.save({ ...patData, nodeId: node.id });

      const result = await service.getPatById(pat.id);

      expect(result?.id).toEqual(pat.id);
      expect(result?.name).toEqual(patData.name);
    });
    it('should retrieve PAT and load node relationship', async () => {
      const patData = makePATData();
      const pat = await repository.save({ ...patData, nodeId: node.id });

      const result = await service.getPatById(pat.id, ['node']);

      expect(result?.id).toEqual(pat.id);
      expect(result?.name).toEqual(patData.name);
      expect(result?.node.name).toEqual(node.name);
    });
  });

  describe('Create PAT for Node', () => {
    it('should create PAT and return signed token', async () => {
      const patData = makePATData();

      const result = await service.createNodePAT(node.id, patData);

      expect(result.id).toBeDefined();
      expect(result.token).toEqual(expect.any(String));

      const buff = Buffer.from(result.token.split('.')[0], 'base64').toString(
        'utf-8',
      );
      const claims = JSON.parse(buff);

      expect(claims.id).toEqual(result.id);
      // expect(claims.node).toEqual(node.name);
      // expect(claims.address).toEqual(node.address);
      expect(claims.type).toEqual('client');
    });
  });

  describe('Revoke PAT for node', () => {
    it('should revoke pat', async () => {
      const patData = makePATData();
      const pat = await repository.save({ ...patData, nodeId: node.id });

      await service.revokeToken(pat.id);

      const revoked = await service.getPatById(pat.id);

      expect(revoked?.revoked).toBe(true);
    });
  });

  describe('Remove PAT for node', () => {
    it('should delete PAT with given id', async () => {
      const patData = makePATData();
      const pat = await repository.save({ ...patData, nodeId: node.id });

      await service.deletePat(pat.id);

      // await expect(service.getPatById(pat.id)).rejects.toBeInstanceOf(NotFoundError);
      const deleted = await service.getPatById(pat.id);

      expect(deleted).toBeNull();
    });
  });
});
