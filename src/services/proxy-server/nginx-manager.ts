import Container from 'typedi';
import { Domain, SSLTermination } from '../../database/models/domain';
import { HttpService } from '../../database/models/http-service';
import { TcpService } from '../../database/models/tcp-service';
import CLI from '../../utils/cli';
import FileManager from '../../utils/file-manager';
import IP_CIDR from '../../utils/ip-cidr';
import { NginxConf } from './conf/nginx-conf';
import { NginxLocationConf } from './conf/nginx-location-conf';
import { NginxServerConf } from './conf/nginx-server-conf';
import { SSLManager } from './ssl-manager';
import { DomainRepository } from '../../repositories/domain-repository';
import ServerUtils from '../../utils/server';

export class NginxManager {
  static async addDomainServer(
    domain: Domain,
    restart = true,
  ): Promise<boolean> {
    const domianName = domain.domain;

    const serverConf = new NginxServerConf();

    serverConf
      .setListen('443 ssl')
      .setListen('[::]:443 ssl')
      .setServerName(domianName)
      .setAccessLog(ServerUtils.getLogFilePath(domianName, 'access.log'))
      .setErrorLog(ServerUtils.getLogFilePath(domianName, 'error.log'))
      .setHttpSSLCertificates(domain.sslPair)
      .includeLocations(`${domianName}/*.conf`);

    const confFile = `/etc/nginx/conf.d/${domianName}.conf`;
    await FileManager.saveToFile(confFile, serverConf.getNginxConf());

    await this.addDefaultMainLocation(domianName);

    return this.checkConfig(confFile, restart);
  }

  static async removeDomainServerConfig(
    domain: Domain,
    restart = true,
  ): Promise<void> {
    const domainName = domain.domain;
    await FileManager.removeFile(`/etc/nginx/conf.d/${domainName}.conf`);

    if (domain.ssl === 'self-signed') {
      const certPath = SSLManager.getCertPath(
        domainName,
        domain.ssl as SSLTermination,
      );

      await FileManager.removeDir(certPath);
    } else {
      await SSLManager.deleteCertbotCertificate(domainName);
    }

    await FileManager.removeDir(ServerUtils.getLogsDir(domainName));

    if (restart) {
      await this.reloadServer();
    }
  }

  static async addHttpService(
    service: HttpService,
    restart = true,
  ): Promise<boolean> {
    if (!service.enabled) {
      if (restart) {
        await this.reloadServer();
      }
      return;
    }

    const serviceLocation: NginxLocationConf = new NginxLocationConf();

    if (service.blockedIps?.length) {
      for (const ipOrSubnet of service.blockedIps) {
        serviceLocation.setDeny(ipOrSubnet);
      }
    }

    if (service.allowedIps?.length) {
      for (const ipOrSubnet of service.allowedIps) {
        serviceLocation.setAllow(ipOrSubnet);
      }
      serviceLocation.setDeny('all');
    }

    let host = service.node.address;

    if (
      (service.node.isGateway || service.node.isLocal) &&
      service.backendHost
    ) {
      host = service.backendHost;

      if (service.node.isGateway && !IP_CIDR.isValidIP(service.backendHost)) {
        serviceLocation.setResolver(service.node.address);
      }
    }

    serviceLocation
      .setNetworkAccess(service.allowedIps)
      .setClientMaxBodySize('100m')
      .addBlock(`set $${service.identifier}`, host)
      .setProxyPass(
        `${service.backendProto}://$${service.identifier}:${service.backendPort}`,
      );

    if (service.backendProto === 'https') {
      serviceLocation.setProxySslVerify('off');
    }

    const confFile = await this.saveLocation(
      serviceLocation,
      service.domain,
      service.pathLocation,
    );

    return this.checkConfig(confFile, restart);
  }

  static async removeHttpService(
    service: HttpService,
    restart = true,
  ): Promise<void> {
    await this.removeLocation(service.domain, service.pathLocation);

    if (restart) {
      await this.reloadServer();
    }
  }

  static async handleTcpService(
    service: TcpService,
    restart = true,
  ): Promise<boolean> {
    if (!service.enabled) {
      if (restart) {
        await this.reloadServer();
      }
      return;
    }

    const streamConf = new NginxConf();

    if (
      service.node.isGateway &&
      service.backendHost &&
      !IP_CIDR.isValidIP(service.backendHost)
    ) {
      streamConf.addBlock('resolver', `${service.node.address} valid=30s`);
    }

    const serverAddress =
      (service.node.isGateway || service.node.isLocal) && service.backendHost
        ? service.backendHost
        : service.node.address;

    streamConf.addUpstreams(service.identifier, [
      `${serverAddress}:${service.backendPort}`,
    ]);

    const serverConf = new NginxServerConf();

    if (service.blockedIps?.length) {
      for (const ipOrSubnet of service.blockedIps) {
        serverConf.setDeny(ipOrSubnet);
      }
    }

    if (service.allowedIps?.length) {
      for (const ipOrSubnet of service.allowedIps) {
        serverConf.setAllow(ipOrSubnet);
      }
      serverConf.setDeny('all');
    }

    serverConf
      .setListen(`${service.port}${service.proto === 'udp' ? ' udp' : ''}`)
      .setServerName(service.domain || '')
      .setAccessLog(
        ServerUtils.getLogFilePath(
          service.domain || '_',
          `${service.identifier}_stream.log`,
        ),
        'stream_logs',
      );

    if (service.ssl) {
      if (service.domain) {
        const domain = await Container.get(DomainRepository).getDomainByName(
          service.domain,
        );

        if (domain) {
          serverConf.setStreamSSLCertificate(domain.sslPair);
        }
      } else {
        const sslPair = await SSLManager.getSelfSignedCertificates('_');
        serverConf.setStreamSSLCertificate(sslPair);
      }
    }

    serverConf.setStreamProxy(service.identifier);

    streamConf.addServer(serverConf);

    const confFile = `/etc/nginx/stream.d/${service.identifier}.conf`;

    await FileManager.saveToFile(confFile, streamConf.getNginxConf());

    return this.checkConfig(confFile, restart);
  }

  static async removeTcpService(
    service: TcpService,
    restart = true,
  ): Promise<void> {
    await FileManager.removeFile(
      `/etc/nginx/stream.d/${service.identifier}.conf`,
    );

    if (restart) {
      await this.reloadServer();
    }
  }

  static async checkConfig(confFile: string, restart = true): Promise<boolean> {
    const check = await this.testServer();

    if (!check) {
      console.log(`Nginx failed testing file ${confFile}`);
      await FileManager.rename(confFile, confFile + '.err');
      return false;
    }

    if (restart) {
      await this.reloadServer();
    }

    return true;
  }

  static async saveLocation(
    config: NginxLocationConf,
    domain?: string,
    location: string = '/',
  ): Promise<string> {
    const confFile = this.getLocationFile(domain, location);

    await FileManager.saveToFile(
      confFile,
      config.getLocationNginxConf(location),
    );

    return confFile;
  }

  static async removeLocation(
    domain?: string,
    location: string = '/',
  ): Promise<void> {
    const confFile = this.getLocationFile(domain, location);

    await FileManager.removeFile(confFile);
  }

  static async reloadServer(): Promise<void> {
    await CLI.exec(`nginx -s reload`);
  }

  private static async addDefaultMainLocation(
    domain?: string,
  ): Promise<string> {
    const defaultLocationConf = new NginxLocationConf();

    defaultLocationConf.setRoot('/etc/nginx/default_pages');

    return this.saveLocation(defaultLocationConf, domain);
  }

  private static getLocationFile(domain?: string, path: string = '/'): string {
    const locPath = `/etc/nginx/locations/${domain && domain !== '_' ? domain : 'default'}`;
    FileManager.mkdirSync(locPath);

    let transformed = path.replace(/^\//, '');

    if (transformed === '') {
      transformed = '__main';
    } else {
      transformed = transformed.replace(/\//g, '-');
    }

    return `${locPath}/${transformed}.conf`;
  }

  private static async testServer(): Promise<boolean> {
    try {
      await CLI.exec('nginx -t');

      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  }
}
