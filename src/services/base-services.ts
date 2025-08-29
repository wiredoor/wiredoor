import { Service } from 'typedi';
import { NodeRepository } from '../repositories/node-repository';
import { NotFoundError } from 'routing-controllers';
import IP_CIDR from '../utils/ip-cidr';
import Net from '../utils/net';
import { ValidationError } from '../utils/errors/validation-error';

@Service()
export class BaseServices {
  constructor(private readonly nodeRepo: NodeRepository) {}

  protected async checkNodePort(
    nodeId: number,
    port: number,
    host?: string,
    ssl?: boolean,
  ): Promise<void> {
    const node = await this.nodeRepo.findOne({
      where: { id: nodeId },
    });

    if (!node) {
      throw new NotFoundError('Node not found!');
    }

    const server =
      (node.isGateway || node.isLocal) && host ? host : node.address;
    const resolver =
      node.isGateway && host && !IP_CIDR.isValidIP(host) ? node.address : null;

    const portAvailable = await Net.checkPort(server, port, resolver, ssl);

    if (!portAvailable) {
      throw new ValidationError({
        body: [
          {
            field: 'backendPort',
            message: `Unable to reach out port ${port} in ${server}`,
          },
        ],
      });
    }
  }
}
