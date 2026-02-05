import { Inject, Service } from 'typedi';
import { Node } from '../../database/models/node';
import { RepositoryQueryFilter } from './repository-query-filter';
import { NodeRepository } from '../node-repository';
import { Like, Not, SelectQueryBuilder } from 'typeorm';
import WGCli from '../../utils/wg-cli';

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
      return this.builder.andWhere({
        isGateway: param === 'gateways',
      });
    }
  }

  async status(
    param:
      | 'online'
      | 'offline'
      | 'disabled'
      | 'enabled'
      | undefined = undefined,
  ): Promise<SelectQueryBuilder<Node>> {
    if (param) {
      if (param === 'disabled' || param === 'enabled') {
        return this.builder.andWhere({
          enabled: param === 'enabled',
        });
      } else {
        const recentConnections = await WGCli.getRecentConnections();
        if (param === 'online') {
          return this.builder.andWhere('publicKey IN (:...ids)', {
            ids: recentConnections.map((conn) => conn.publicKey),
            enabled: true,
          });
        } else if (param === 'offline') {
          return this.builder.andWhere('publicKey NOT IN (:...ids)', {
            ids: recentConnections.map((conn) => conn.publicKey),
            enabled: true,
          });
        }
        return this.builder;
      }
    }
  }

  search(param: string | undefined = undefined): SelectQueryBuilder<Node> {
    if (param) {
      return this.builder.andWhere({
        name: Like(`%${param}%`),
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
