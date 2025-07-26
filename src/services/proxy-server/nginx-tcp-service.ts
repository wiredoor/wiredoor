import Container from 'typedi';
import { TcpService } from '../../database/models/tcp-service';
import { NginxService } from './nginx-service';
import { NginxConf } from './conf/nginx-conf';
import IP_CIDR from '../../utils/ip-cidr';
import { NginxServerConf } from './conf/nginx-server-conf';
import ServerUtils from '../../utils/server';
import { DomainRepository } from '../../repositories/domain-repository';
import { SSLManager } from './ssl-manager';
import { logger } from '../../providers/logger';

export class NginxTcpService extends NginxService {
  async create(service: TcpService, restart = true): Promise<boolean> {
    if (!service.enabled) {
      if (restart) {
        await this.reloadNginx();
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

        if (domain?.sslPair) {
          serverConf.setStreamSSLCertificate(domain.sslPair);
        } else {
          const sslPair = await SSLManager.getSelfSignedCertificates(
            service.domain,
          );
          serverConf.setStreamSSLCertificate(sslPair);
        }
      } else {
        const sslPair = await SSLManager.getSelfSignedCertificates('_');
        serverConf.setStreamSSLCertificate(sslPair);
      }
    }

    serverConf.setStreamProxy(service.identifier);

    streamConf.addServer(serverConf);

    const confFile = `/etc/nginx/stream.d/${service.identifier}.conf`;

    await this.saveFile(confFile, streamConf.getNginxConf());

    logger.info(
      `Saved TCP stream config for ${service.publicAccess} to ${confFile}`,
    );

    return this.checkAndReload(confFile, restart);
  }

  async remove(service: TcpService, restart = true): Promise<void> {
    const confFile = `/etc/nginx/stream.d/${service.identifier}.conf`;

    await this.removeFile(confFile);

    logger.info(
      `Removed TCP stream config ${confFile} for ${service.publicAccess}`,
    );

    this.resetTCPConnections(service);

    if (restart) {
      await this.reloadNginx();
    }
  }
}
