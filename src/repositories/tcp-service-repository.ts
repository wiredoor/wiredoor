import { Inject, Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { TcpService } from '../database/models/tcp-service';
import config from '../config';
import { ValidationError } from '../utils/errors/validation-error';
import Net from '../utils/net';

@Service()
export class TcpServiceRepository extends Repository<TcpService> {
  constructor(@Inject('dataSource') dataSource: DataSource) {
    super(TcpService, dataSource.createEntityManager());
  }

  async assertPortAvailable(port: number, serviceId?: number): Promise<void> {
    const query = this.createQueryBuilder('tcpService').where(
      'tcpService.port = :port',
      { port },
    );

    if (serviceId) {
      query.andWhere('tcpService.id != :serviceId', { serviceId });
    }

    const isUsed =
      (await query.getCount()) > 0 ||
      (await Net.checkPort('127.0.0.1', port, null, null, 500));

    if (isUsed) {
      throw new ValidationError({
        body: [{ field: 'port', message: `Port ${port} is already in use.` }],
      });
    }
  }

  async getAvailablePort(): Promise<number> {
    if (!config.server.port_range && !config.server.additional_ports) {
      throw new ValidationError({
        body: [
          {
            field: 'port',
            message:
              'Your servers needs TCP_SERVICES_PORT_RANGE or ADDITIONAL_TCP_SERVICES_PORTS env variable defined.',
          },
        ],
      });
    }

    const servicePorts = await this.createQueryBuilder('tcpService')
      .select('tcpService.port', 'port')
      .getRawMany();
    const usedPorts = servicePorts.map((service) => +service.port);
    const additionalPorts = config.server.additional_ports
      ? config.server.additional_ports.split(',').map((p) => +p)
      : [];

    if (config.server.port_range) {
      const [min, configuredMax] = config.server.port_range
        .split('-')
        .map((p) => +p);
      const max = configuredMax || min;

      try {
        const port = await Net.getAvailableLocalPort(usedPorts, min, max);
        if (port) return port;
      } catch (error) {
        if (!additionalPorts.length) {
          throw new ValidationError({
            body: [
              {
                field: 'port',
                message: error instanceof Error ? error.message : String(error),
              },
            ],
          });
        }
      }
    }

    for (const port of additionalPorts) {
      if (usedPorts.includes(port)) continue;

      const isUsed = await Net.checkPort('127.0.0.1', port, null, null, 500);
      if (!isUsed) return port;
    }

    throw new ValidationError({
      body: [
        {
          field: 'port',
          message: 'No ports available to expose your service.',
        },
      ],
    });
  }
}
