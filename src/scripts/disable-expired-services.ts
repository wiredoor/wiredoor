import Container from 'typedi';
import db from '../providers/db';
import { HttpServiceRepository } from '../repositories/http-service-repository';
import { TcpServiceRepository } from '../repositories/tcp-service-repository';
import { HttpServicesService } from '../services/http-services-service';
import { TcpServicesService } from '../services/tcp-services-service';
import { LessThan } from 'typeorm';
import { HttpService } from '../database/models/http-service';
import { TcpService } from '../database/models/tcp-service';

(async (): Promise<void> => {
  await db();

  const httpServiceRepository = Container.get(HttpServiceRepository);
  const tcpServiceRepository = Container.get(TcpServiceRepository);

  const httpServicesService = Container.get(HttpServicesService);
  const tcpServicesService = Container.get(TcpServicesService);

  const expiringHttpServices = await httpServiceRepository.find({
    where: {
      expiresAt: LessThan(nextFullMinute()),
    },
  });

  const expiringTcpServices = await tcpServiceRepository.find({
    where: {
      expiresAt: LessThan(nextFullMinute()),
    },
  });

  await Promise.all([
    disableExpiringServices(expiringHttpServices, (id: number) =>
      httpServicesService.disableService(id),
    ),
    disableExpiringServices(expiringTcpServices, (id: number) =>
      tcpServicesService.disableService(id),
    ),
  ]);
})();

async function disableExpiringServices(
  services: HttpService[] | TcpService[],
  callback: (id: number) => Promise<unknown>,
): Promise<void> {
  if (!services.length) {
    return;
  }

  for (const service of services) {
    if (service.expiresAt > new Date()) {
      const timeout =
        new Date(service.expiresAt).getTime() - new Date().getTime();
      console.log(
        `Service ${service.name} with ID: ${service.id} will be disabled within ${timeout}ms`,
      );
      setTimeout(async () => {
        try {
          await callback(service.id);
          console.log(
            `Service with expiresAt ${service.expiresAt} ID: ${service.id} disabled at ${new Date()}`,
          );
        } catch (e) {
          console.error(e);
        }
      }, timeout);
    } else {
      await callback(service.id);
    }
  }
}

function nextFullMinute(): Date {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() + 1);
  return now;
}
