import { Inject, Service } from 'typedi';
import { HttpResource } from '../../database/models/http-resource';
import { RepositoryQueryFilter } from './repository-query-filter';
import { HttpResourceRepository } from '../http-resource-repository';

@Service()
export class HttpResourceQueryFilter extends RepositoryQueryFilter<
  HttpResource,
  HttpResourceRepository
> {
  constructor(@Inject() repository: HttpResourceRepository) {
    super(repository);
    this.alias = 'resource';
  }

  public before(): void {
    // To use if necessary in child classes
    this.builder
      .leftJoin('resource.httpUpstreams', 'httpUpstreams')
      .leftJoin('httpUpstreams.node', 'node')
      .leftJoin('resource.accessRules', 'accessRules')
      .leftJoin('resource.edgeRules', 'edgeRules')
      .select([
        'resource.id',
        'resource.name',
        'resource.domain',
        'resource.enabled',
        'resource.oidcProviderId',
        'httpUpstreams.id',
        'httpUpstreams.type',
        'httpUpstreams.pathPattern',
        'httpUpstreams.targetProtocol',
        'httpUpstreams.targetHost',
        'httpUpstreams.targetPort',
        'httpUpstreams.targetNodeId',
        'node.id',
        'node.name',
        'node.isGateway',
        'accessRules.id',
        'accessRules.matchType',
        'accessRules.pattern',
        'accessRules.methods',
        'accessRules.action',
        'edgeRules.id',
        'edgeRules.matchType',
        'edgeRules.pattern',
        'edgeRules.methods',
        'edgeRules.action',
      ]);
  }

  protected allowedRelations(): string[] {
    return ['httpUpstreams', 'accessRules', 'edgeRules'];
  }
}
