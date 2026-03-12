import config from '../../../config';
import { Domain } from '../../../database/models/domain';
import ServerUtils from '../../../utils/server';
import { NginxServerConf } from '../conf/nginx-server-conf';
import {
  NginxConfigCompiler,
  ConfigFragment,
  NginxCompiler,
} from './nginx-compiler';

export class DomainConfigCompiler
  extends NginxConfigCompiler
  implements NginxCompiler<Domain>
{
  getResourceKey(domain: Domain): string {
    return domain.domain;
  }

  compile(domain: Domain): ConfigFragment[] {
    const fragments: ConfigFragment[] = [];

    const domainConf = this.compileDomain(domain);
    fragments.push({
      scope: 'domain',
      relativePath: `${this.safeDomain(domain.domain)}.conf`,
      content: domainConf,
    });

    return fragments;
  }

  getFragmentPaths(domain: Domain): ConfigFragment[] {
    return [
      {
        scope: 'domain',
        relativePath: `${this.safeDomain(domain.domain)}.conf`,
        content: '',
      },
    ];
  }

  private compileDomain(domain: Domain): string {
    const domainName = this.safeDomain(domain.domain);
    const serverConf = new NginxServerConf();

    serverConf.setListen('443 ssl').setListen('[::]:443 ssl');

    if (config.nginx.http3domain && domainName === config.nginx.http3domain) {
      serverConf
        .setListen('443 quic reuseport')
        .setListen('[::]:443 quic reuseport')
        .addBlock('add_header Alt-Svc', '\'h3=":443"; ma=86400\' always');
    }

    const sslPair = domain.sslPair;

    serverConf
      .setServerName(domainName)
      .setAccessLog(ServerUtils.getLogFilePath(domainName, 'access.log'))
      .setErrorLog(ServerUtils.getLogFilePath(domainName, 'error.log'))
      .setHttpSSLCertificates(sslPair)
      .setDefaultPages();

    // Default client max body size for the domain (can be overridden by edge rules)
    if (config.nginx.bodySize) {
      serverConf.setClientMaxBodySize(config.nginx.bodySize);
    }

    serverConf.addBlock('# Wiredoor Access Config', '');
    serverConf.addBlock('include', 'partials/wiredoor_access.conf');

    serverConf.includeLocations(`${domainName}/*.conf`);

    return serverConf.getNginxConf();
  }
}
