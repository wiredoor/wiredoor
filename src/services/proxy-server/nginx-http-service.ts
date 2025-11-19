import Container from 'typedi';
import { HttpService } from '../../database/models/http-service';
import { NginxLocationConf } from './conf/nginx-location-conf';
import { NginxService } from './nginx-service';
import { DomainRepository } from '../../repositories/domain-repository';
import IP_CIDR from '../../utils/ip-cidr';
import { NginxConf } from './conf/nginx-conf';
import { logger } from '../../providers/logger';

type LocationType = 'exact' | 'regex';

const isValidLocationSyntax = (route: string): boolean => {
  if (route.startsWith('@')) return false;
  if (!route.startsWith('/') && !route.startsWith('^')) return false;
  return true;
};

const parseLocationType = (line: string): LocationType | null => {
  if (line.startsWith('^')) return 'regex';
  if (line.startsWith('/')) return 'exact';
  return null;
};

export class NginxHttpService extends NginxService {
  async create(service: HttpService, restart = true): Promise<boolean> {
    if (!service.enabled) {
      if (restart) {
        await this.reloadNginx();
      }
      return;
    }

    const nginxConf = await this.buildNginxConf(service);

    const confFile = this.getLocationFile(service.domain, service.pathLocation);

    await this.saveFile(confFile, nginxConf.getNginxConf());

    logger.info(
      `Saved HTTP location config for ${service.publicAccess} to ${confFile}`,
    );

    return this.checkAndReload(confFile, restart);
  }

  async remove(service: HttpService, restart = true): Promise<void> {
    const confFile = this.getLocationFile(service.domain, service.pathLocation);

    await this.removeFile(confFile);

    logger.info(
      `HTTP location ${service.publicAccess} config ${confFile} removed `,
    );

    this.resetTCPConnections(service);

    if (restart) {
      await this.reloadNginx();
    }
  }

  private async buildNginxConf(service: HttpService): Promise<NginxConf> {
    const baseLocation = new NginxLocationConf();

    if (service.requireAuth) {
      const domain = await Container.get(DomainRepository).findOneBy({
        domain: service.domain,
      });

      if (domain.oauth2ServicePort) {
        baseLocation.setAuthRequired();
      }
    }

    let host = service.node.address;

    if (
      (service.node.isGateway || service.node.isLocal) &&
      service.backendHost
    ) {
      host = service.backendHost;

      if (service.node.isGateway && !IP_CIDR.isValidIP(service.backendHost)) {
        baseLocation.setResolver(service.node.address);
      }
    }

    baseLocation
      .setNetworkAccess(service.allowedIps)
      .includeCommonProxySettings()
      .addBlock(`set $${service.identifier}`, host)
      .setProxyPass(
        `${service.backendProto}://$${service.identifier}:${service.backendPort}`,
      );

    if (service.backendProto === 'https') {
      baseLocation.setProxySslVerify('off');
    }

    const nginxConf = new NginxConf();

    nginxConf.addLocation(service.pathLocation, baseLocation);

    if (service.requireAuth && service.skipAuthRoutes) {
      const lines = service.skipAuthRoutes
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => !!line && isValidLocationSyntax(line));

      for (const route of lines) {
        const type = parseLocationType(route);
        if (!type) continue;

        const cleanLocation = baseLocation.clone().removeAuth();

        if (type === 'regex') {
          nginxConf.addLocation(`~ ${route}`, cleanLocation);
        } else if (type === 'exact') {
          nginxConf.addLocation(`= ${route}`, cleanLocation);
        }
      }
    }

    return nginxConf;
  }
}
