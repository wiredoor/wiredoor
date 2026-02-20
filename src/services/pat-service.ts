import { Inject, Service } from 'typedi';
import { PersonalAccessTokenRepository } from '../repositories/personal-access-token-repository';
import jwt from 'jsonwebtoken';
import config from '../config';
import {
  PersonalAccessToken,
  PersonalAccessTokenWithToken,
} from '../database/models/personal-access-token';
import {
  CreatePATType,
  PatFilterQueryParams,
} from '../validators/pat-validator';
import { PatQueryFilter } from '../repositories/filters/pat-query-filter';
import { PagedData } from '../schemas/shared-schemas';

@Service()
export class PatService {
  constructor(
    @Inject()
    private readonly personalAccessTokenRepository: PersonalAccessTokenRepository,
    @Inject() private readonly patFilter: PatQueryFilter,
  ) {}

  async getPATs(
    nodeId: number,
    params: PatFilterQueryParams,
  ): Promise<
    PersonalAccessToken | PersonalAccessToken[] | PagedData<PersonalAccessToken>
  > {
    return this.patFilter.apply({ ...params, nodeId });
  }

  getPatById(
    id: number,
    relations: string[] = [],
  ): Promise<PersonalAccessToken> {
    return this.personalAccessTokenRepository.findOne({
      where: {
        id,
      },
      relations,
    });
  }

  async createNodePAT(
    nodeId: number,
    params: CreatePATType,
  ): Promise<PersonalAccessTokenWithToken> {
    const pat = await this.personalAccessTokenRepository.save({
      ...params,
      nodeId,
    });

    const token = jwt
      .sign(
        {
          id: pat.id,
          type: 'client',
        },
        config.jwt.secret,
      )
      .split('.')
      .splice(1, 2)
      .join('.');

    return {
      ...pat,
      token,
    };
  }

  public async updatePat(
    id: number,
    params: Partial<CreatePATType>,
  ): Promise<PersonalAccessToken> {
    const pat = await this.personalAccessTokenRepository.save({
      id,
      ...params,
    });

    return pat;
  }

  async revokeToken(id: number): Promise<PersonalAccessToken> {
    return this.updatePat(id, { revoked: true });
  }

  async deletePat(id: number): Promise<string> {
    await this.personalAccessTokenRepository.delete(id);

    return 'Deleted!';
  }

  async deleteAllTokens(nodeId: number): Promise<void> {
    await this.personalAccessTokenRepository.delete({ nodeId });
  }
}
