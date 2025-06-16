import Container from 'typedi';
import { loadApp } from '../../main';
import { DataSource } from 'typeorm';
import {
  mockCLIExec,
  mockIsPath,
  mockNslookup,
  mockRemoveDir,
  mockRemoveFile,
  mockSaveToFile,
} from '../.jest/global-mocks';
import { DomainRepository } from '../../repositories/domain-repository';
import { DomainsService } from '../../services/domains-service';
import { DomainQueryFilter } from '../../repositories/filters/domain-query-filter';
import { makeDomainData } from './stubs/domain.stub';
import { PagedData } from '../../repositories/filters/repository-query-filter';
import { Domain } from '../../database/models/domain';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let app;
let dataSource: DataSource;

beforeAll(async () => {
  app = await loadApp();
  dataSource = Container.get('dataSource');
});

afterAll(async () => {});

describe('Domains Service', () => {
  let repository: DomainRepository;
  let service: DomainsService;
  let filter: DomainQueryFilter;

  beforeEach(async () => {
    repository = new DomainRepository(dataSource);
    filter = new DomainQueryFilter(repository);
    service = new DomainsService(repository, filter);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await repository.clear();
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should update server configuration files for all Domains when initialize', async () => {
      const domainData1 = makeDomainData({ ssl: 'self-signed' });
      const domainData2 = makeDomainData({ ssl: 'certbot' });

      await repository.save(domainData1);
      await repository.save(domainData2);

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return true;
        }),
      );

      jest.clearAllMocks();

      await service.initialize();

      expect(mockSaveToFile.mock.calls).toEqual([
        [
          `/etc/nginx/conf.d/${domainData1.domain}.conf`,
          expect.stringContaining(` ${domainData1.domain};`),
        ],
        [
          `/etc/nginx/locations/${domainData1.domain}/__main.conf`,
          expect.stringContaining(`root /etc/nginx/default_pages;`),
        ],
        [
          `/etc/nginx/conf.d/${domainData2.domain}.conf`,
          expect.stringContaining(` ${domainData2.domain};`),
        ],
        [
          `/etc/nginx/locations/${domainData2.domain}/__main.conf`,
          expect.stringContaining(`root /etc/nginx/default_pages;`),
        ],
      ]);

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`openssl.*${domainData1.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        [
          expect.stringMatching(
            new RegExp(`openssl.*${domainData1.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        [
          expect.stringMatching(
            new RegExp(`openssl.*${domainData1.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        [
          expect.stringMatching(
            new RegExp(`certbot.*${domainData2.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        ['supervisorctl reread && supervisorctl update'],
      ]);
    });
  });

  describe('List Domains', () => {
    it('should list all Domains', async () => {
      const data = makeDomainData();
      const domain = await repository.save({ ...data });

      const result = await service.getDomains({});

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ domain: data.domain }),
        ]),
      );
    });
    it('should list Domains paginated', async () => {
      const data = makeDomainData();
      await repository.save({ ...data });

      const result = await service.getDomains({ limit: 1 });

      expect((result as PagedData<Domain>).data.length).toEqual(1);
    });
  });

  describe('Create Domain', () => {
    it('should create Domain and save server configuration file', async () => {
      const data = makeDomainData({ ssl: 'self-signed' });

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return false;
        }),
      );

      jest.clearAllMocks();

      const result = await service.createDomain(data);

      expect(result.id).toBeDefined();
      expect(result.domain).toEqual(data.domain);

      expect(mockSaveToFile.mock.calls).toEqual([
        [
          `/etc/nginx/conf.d/${data.domain}.conf`,
          expect.stringContaining(` ${data.domain};`),
        ],
        [
          `/etc/nginx/locations/${data.domain}/__main.conf`,
          expect.stringContaining(`root /etc/nginx/default_pages;`),
        ],
      ]);

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`openssl.*${data.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        [
          expect.stringMatching(
            new RegExp(`openssl.*${data.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        [
          expect.stringMatching(
            new RegExp(`openssl.*${data.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);
    });
    it('should create Domain and call certbot', async () => {
      const data = makeDomainData({ ssl: 'certbot' });

      mockNslookup.mockImplementation(
        jest.fn(() => {
          return true;
        }),
      );

      jest.clearAllMocks();

      const result = await service.createDomain(data);

      expect(result.id).toBeDefined();
      expect(result.domain).toEqual(data.domain);

      expect(mockSaveToFile.mock.calls).toEqual([
        [
          `/etc/nginx/conf.d/${data.domain}.conf`,
          expect.stringContaining(` ${data.domain};`),
        ],
        [
          `/etc/nginx/locations/${data.domain}/__main.conf`,
          expect.stringContaining(`root /etc/nginx/default_pages;`),
        ],
      ]);

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`certbot.*${data.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);
    });
    it('should create domain with authentication enabled', async () => {
      const data = makeDomainData({ ssl: 'certbot', authentication: true });

      jest.clearAllMocks();

      const result = await service.createDomain(data);

      expect(result.oauth2ServicePort).toEqual(expect.any(Number));
      expect(result.id).toBeDefined();
      expect(result.domain).toEqual(data.domain);

      expect(mockSaveToFile.mock.calls).toEqual([
        [
          `/data/oauth2/.cookie-secret-${data.domain}`,
          expect.any(String),
          'utf-8',
          0o600,
        ],
        [
          `/opt/oauth2-proxy/${data.domain}-emails`,
          result.oauth2Config.allowedEmails.join('\n'),
          'utf-8',
          0o644,
        ],
        [
          `/etc/supervisor/conf.d/oauth2-proxy-d${result.id}.conf`,
          expect.stringContaining(
            ` OAUTH2_PROXY_HTTP_ADDRESS="127.0.0.1:${result.oauth2ServicePort}",`,
          ),
          'utf-8',
          0o644,
        ],
        [
          `/etc/nginx/conf.d/${data.domain}.conf`,
          expect.stringContaining(
            ` http://127.0.0.1:${result.oauth2ServicePort};`,
          ),
        ],
        [
          `/etc/nginx/locations/${data.domain}/__main.conf`,
          expect.stringContaining(`root /etc/nginx/default_pages;`),
        ],
      ]);

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`certbot.*${data.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['supervisorctl reread && supervisorctl update'],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);
    });
  });

  describe('Update Domain', () => {
    it('should update Domain and save server configuration file', async () => {
      const data = makeDomainData();

      const created = await service.createDomain(data);

      jest.clearAllMocks();

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const result = await service.updateDomain(created.id, {
        ssl: 'certbot',
        domain: created.domain,
      });

      // expect(result.domain).toEqual(update.domain);

      expect(mockSaveToFile.mock.calls).toEqual([
        [
          `/etc/nginx/conf.d/${data.domain}.conf`,
          expect.stringContaining(` ${data.domain};`),
        ],
        [
          `/etc/nginx/locations/${data.domain}/__main.conf`,
          expect.stringContaining(`root /etc/nginx/default_pages;`),
        ],
      ]);

      expect(mockCLIExec.mock.calls).toEqual([
        [
          expect.stringMatching(
            new RegExp(`certbot.*${data.domain?.replace('.', '\\.')}.*`),
          ),
        ],
        ['nginx -t'],
        ['nginx -s reload'],
      ]);
    });
  });

  describe('Delete Domain', () => {
    it('should delete Domain and server config file', async () => {
      const data = makeDomainData();

      mockIsPath.mockImplementation(() => {
        return true;
      });
      const created = await service.createDomain(data);

      jest.clearAllMocks();

      await service.deleteDomain(created.id);

      expect(mockRemoveFile).toHaveBeenCalledWith(
        expect.stringContaining(`/${data.domain}.conf`),
      );

      if (data.ssl === 'certbot') {
        expect(mockCLIExec).toHaveBeenCalledWith(
          `certbot delete --cert-name ${data.domain} -n`,
        );
      } else {
        expect(mockRemoveDir).toHaveBeenCalledWith(
          expect.stringContaining(`/${data.domain}`),
        );
      }

      expect(mockCLIExec).toHaveBeenCalledWith('nginx -s reload');
    });
  });
});
