import config from '../../config';
import { Domain, SSLTermination } from '../../database/models/domain';
import ServerUtils from '../../utils/server';
import { NginxLocationConf } from './conf/nginx-location-conf';
import { NginxServerConf } from './conf/nginx-server-conf';
import { NginxService } from './nginx-service';
import { SSLManager } from './ssl-manager';

export class NginxDomainService extends NginxService {
  async create(domain: Domain, restart = true): Promise<boolean> {
    const domainName = domain.domain;

    const serverConf = new NginxServerConf();

    serverConf.setListen('443 ssl').setListen('[::]:443 ssl');

    if (config.nginx.http3domain && domainName === config.nginx.http3domain) {
      serverConf
        .setListen('443 quic reuseport')
        .setListen('[::]:443 quic reuseport')
        .addBlock('add_header Alt-Svc', '\'h3=":443"; ma=86400\' always');
    }

    serverConf
      .setServerName(domainName)
      .setAccessLog(ServerUtils.getLogFilePath(domainName, 'access.log'))
      .setErrorLog(ServerUtils.getLogFilePath(domainName, 'error.log'))
      .setHttpSSLCertificates(domain.sslPair)
      .setDefaultPages();

    if (config.nginx.bodySize) {
      serverConf.setClientMaxBodySize(config.nginx.bodySize);
    }

    if (domain.oauth2ServicePort) {
      const oauth2conf: NginxLocationConf = new NginxLocationConf();

      oauth2conf
        .addBlock('proxy_pass', `http://127.0.0.1:${domain.oauth2ServicePort}`)
        .addBlock('proxy_set_header Host', '$host')
        .addBlock('proxy_set_header X-Forwarded-Host', '$host')
        .addBlock('proxy_set_header X-Real-IP', '$remote_addr');

      const oauth2LocationConf = oauth2conf.clone();

      oauth2LocationConf
        .addBlock('proxy_set_header X-Auth-Request-Redirect', '$request_uri')
        .addBlock('proxy_set_header Content-Length', '""')
        .addBlock('proxy_pass_request_body', 'off');

      serverConf.addBlock('location /oauth2/', oauth2LocationConf.getConf());

      serverConf.addBlock(
        'location = /oauth2/auth',
        oauth2LocationConf.getConf(),
      );

      const oauth2CallbackLocation = new NginxLocationConf();

      oauth2CallbackLocation
        .addBlock('proxy_pass', `http://127.0.0.1:${domain.oauth2ServicePort}`)
        .addBlock('proxy_set_header Host', '$host')
        .addBlock('proxy_set_header X-Forwarded-Host', '$host')
        .addBlock('proxy_set_header X-Real-IP', '$remote_addr')
        .addBlock('proxy_pass_request_headers', 'on')
        .addBlock('error_page 403', '= @logout_and_retry');

      serverConf.addBlock(
        'location = /oauth2/callback',
        oauth2CallbackLocation.getConf(),
      );

      const logoutAndRetryLocation = new NginxLocationConf();

      logoutAndRetryLocation.addBlock('return 302', '/oauth2/sign_out');

      serverConf.addBlock(
        'location @logout_and_retry',
        logoutAndRetryLocation.getConf(),
      );
    }

    serverConf.includeLocations(`${domainName}/*.conf`);

    const confFile = `/etc/nginx/conf.d/${domainName}.conf`;
    await this.saveFile(confFile, serverConf.getNginxConf());

    await this.addDefaultMainLocation(domainName);

    return this.checkAndReload(confFile, restart);
  }

  async remove(domain: Domain, restart = true): Promise<void> {
    const domainName = domain.domain;
    await this.removeFile(`/etc/nginx/conf.d/${domainName}.conf`);

    if (domain.ssl === 'self-signed') {
      const certPath = SSLManager.getCertPath(
        domainName,
        domain.ssl as SSLTermination,
      );

      await this.removeDir(certPath);
    } else {
      await SSLManager.deleteCertbotCertificate(domainName);
    }

    await this.removeDir(ServerUtils.getLogsDir(domainName));

    if (restart) {
      await this.reloadNginx();
    }
  }
}
