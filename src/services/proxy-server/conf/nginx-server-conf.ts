import { SSLCerts } from '../../../database/models/domain';
import { NginxConf } from './nginx-conf';

export class NginxServerConf extends NginxConf {
  constructor(config = []) {
    super(config);
  }

  setListen(port: number | string): NginxServerConf {
    this.addBlock('listen', `${port}`);

    return this;
  }

  setServerName(name?: string): NginxServerConf {
    if (name && name != '_') {
      this.addBlock('server_name', name);
    }

    return this;
  }

  setAccessLog(
    accessLogFile: string,
    format: string = 'combined',
  ): NginxServerConf {
    this.addBlock(
      'access_log',
      `${accessLogFile} ${format} buffer=64k flush=1s`,
    );

    return this;
  }

  setClientMaxBodySize(size: string): NginxServerConf {
    this.addBlock('client_max_body_size', size);

    return this;
  }

  setErrorLog(errorLogFile: string): NginxServerConf {
    this.addBlock('error_log', `${errorLogFile}`);

    return this;
  }

  setSSLCertificate(sslPair: SSLCerts): NginxServerConf {
    this.addBlock('# SSL', '');
    this.addBlock('ssl_certificate', sslPair.fullchain);
    this.addBlock('ssl_certificate_key', sslPair.privkey);

    return this;
  }

  setHttpSSLCertificates(sslPair: SSLCerts): NginxServerConf {
    this.setSSLCertificate(sslPair);

    this.addBlock('# Security partial', '');
    this.addBlock('include', 'partials/security.conf');

    return this;
  }

  setDefaultPages(): NginxServerConf {
    this.addBlock('# Default pages', '');
    this.addBlock('root', '/etc/nginx/default_pages/');
    this.addBlock('index', 'index.html');

    return this;
  }

  setStreamSSLCertificate(sslPair: SSLCerts): NginxServerConf {
    this.setSSLCertificate(sslPair);
    this.addBlock('include', 'partials/stream_ssl.conf');

    return this;
  }

  setStreamProxy(upstreamOrEndpoint: string): NginxServerConf {
    this.addBlock('# PROXY', '');
    this.addBlock('proxy_pass', upstreamOrEndpoint);

    return this;
  }

  public includeLocations(path: string): NginxServerConf {
    this.addBlock('# Locations', '');
    this.addBlock('include', `locations/${path}`);
    return this;
  }

  public getNginxConf(): string {
    const nginxConf = new NginxConf();

    nginxConf.addServer(this);

    return nginxConf.getNginxConf();
  }
}
