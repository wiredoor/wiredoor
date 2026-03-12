import { Inject, Service } from 'typedi';

import { OidcProviderRepository } from '../repositories/oidc-provider-repository';
import { OidcProviderQueryFilter } from '../repositories/filters/oidc-provider-query-filter';
import { OidcProvider } from '../database/models/oidc-provider';

import type {
  OidcProviderFilterQueryParams,
  OidcProviderType,
} from '../schemas/oidc-provider-schemas';
import { PagedData } from '../schemas/shared-schemas';
import { EntityManager } from 'typeorm';
import { encrypt } from '../utils/cypher';

@Service()
export default class OidcProviderService {
  constructor(
    @Inject() private readonly oidcProviderRepository: OidcProviderRepository,
    @Inject() private readonly oidcProviderFilter: OidcProviderQueryFilter,
  ) {}

  async checkOidcDiscovery(
    issuerUrl: string,
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const res = await fetch(
        `${issuerUrl.replace(/\/+$/, '')}/.well-known/openid-configuration`,
        { method: 'GET' },
      );

      if (!res.ok) {
        return { ok: false, error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      if (!data.issuer || !data.authorization_endpoint) {
        return { ok: false, error: 'Missing required OIDC fields' };
      }

      return { ok: true };
    } catch (e: Error | any) {
      return { ok: false, error: e.message };
    }
  }

  /**
   * List / search
   * NOTE: Keep return shape aligned with your repository conventions.
   * If your repository always returns PagedData, simplify this to Promise<PagedData<OidcProvider>>.
   */
  async getOidcProviders(
    filters: OidcProviderFilterQueryParams,
  ): Promise<OidcProvider | OidcProvider[] | PagedData<OidcProvider>> {
    return this.oidcProviderFilter.apply(filters);
  }

  /** Create */
  async createOidcProvider(
    params: OidcProviderType,
    manager?: EntityManager,
  ): Promise<OidcProvider> {
    const { clientSecret, ...rest } = params;
    return this.oidcProviderRepository.save(
      { ...rest, clientSecretEnc: encrypt(clientSecret) },
      manager,
    );
  }

  /** Read by id */
  async getOidcProvider(id: number): Promise<OidcProvider> {
    return this.oidcProviderRepository.findOne({ where: { id } });
  }

  /** Update */
  async updateOidcProvider(
    id: number,
    params: OidcProviderType,
    manager?: EntityManager,
  ): Promise<OidcProvider> {
    const { clientSecret, ...rest } = params;
    return this.oidcProviderRepository.save(
      { id, ...rest, clientSecretEnc: encrypt(clientSecret) },
      manager,
    );
  }

  /** Delete */
  async deleteOidcProvider(
    id: number,
    manager?: EntityManager,
  ): Promise<string> {
    await this.oidcProviderRepository.delete(id, manager);
    return 'Deleted!';
  }
}
