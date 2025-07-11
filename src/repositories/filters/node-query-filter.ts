import { Inject, Service } from 'typedi';
import { Node } from '../../database/models/node';
import { RepositoryQueryFilter } from './repository-query-filter';
import { NodeRepository } from '../node-repository';
import { Not, SelectQueryBuilder } from 'typeorm';

@Service()
export class NodeQueryFilter extends RepositoryQueryFilter<Node> {
  constructor(@Inject() repository: NodeRepository) {
    super(repository);
  }

  // protected allowedRelations(): string[] {
  //   return ['httpServices', 'tcpServices'];
  // }

  type(
    param: 'nodes' | 'gateways' | undefined = undefined,
  ): SelectQueryBuilder<Node> {
    if (param) {
      return this.builder.where({
        isGateway: param === 'gateways',
      });
    }
  }

  wgInterface(
    wgInterface: string | undefined = undefined,
  ): SelectQueryBuilder<Node> {
    if (wgInterface !== undefined) {
      if (wgInterface) {
        return this.builder.where({
          wgInterface,
        });
      } else {
        return this.builder.where({
          wgInterface: Not(''),
        });
      }
    }
  }
}
