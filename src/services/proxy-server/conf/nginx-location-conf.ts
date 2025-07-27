import { NginxConf } from './nginx-conf';

export class NginxLocationConf extends NginxConf {
  constructor(config = []) {
    super(config);
  }

  includeCommonProxySettings(): NginxLocationConf {
    this.addBlock('include', 'partials/proxy.conf');

    return this;
  }

  setAuthRequired(): NginxLocationConf {
    this.addBlock('include', 'partials/require_oauth2.conf');

    if (process.env.OAUTH2_PROXY_SET_XAUTHREQUEST === 'true') {
      this.addBlock(
        'auth_request_set $user',
        '$upstream_http_x_auth_request_user',
      );
      this.addBlock(
        'auth_request_set $email',
        '$upstream_http_x_auth_request_email',
      );
      this.addBlock('proxy_set_header X-User', '$user');
      this.addBlock('proxy_set_header X-Email', '$email');
    }

    if (process.env.OAUTH2_PROXY_PASS_ACCESS_TOKEN === 'true') {
      this.addBlock(
        'auth_request_set $token',
        '$upstream_http_x_auth_request_access_token',
      );
      this.addBlock('proxy_set_header X-Access-Token', '$token');
    }

    return this;
  }

  removeAuth(): this {
    this.config = this.config.filter(([key, value]) => {
      if (key === 'include' && value === 'partials/require_oauth2.conf')
        return false;
      if (key.startsWith('auth_request_set')) return false;
      if (
        key.split(' ')[0] === 'proxy_set_header' &&
        ['X-User', 'X-Email', 'X-Access-Token'].includes(key.split(' ')[1])
      )
        return false;
      return true;
    });

    return this;
  }

  setResolver(resolver: string): NginxLocationConf {
    this.addBlock('resolver', `${resolver} valid=30s`);
    this.addBlock('resolver_timeout', '10s');

    return this;
  }

  setProxyPass(streamOrEndpoint: string): NginxLocationConf {
    this.addBlock('proxy_pass', streamOrEndpoint);

    return this;
  }

  setProxySslVerify(verify: 'on' | 'off'): NginxLocationConf {
    this.addBlock('proxy_ssl_verify', verify);

    return this;
  }

  setClientMaxBodySize(size: string): NginxLocationConf {
    this.addBlock('client_max_body_size', size);

    return this;
  }

  setNetworkAccess(
    allowedIps: string[],
    blockedIps: string[] = [],
  ): NginxLocationConf {
    if (blockedIps?.length) {
      blockedIps.forEach((ip) => this.setDeny(ip));
    }

    if (allowedIps?.length) {
      allowedIps.forEach((ip) => this.setAllow(ip));
      this.setDeny('all');
    }

    return this;
  }

  setRoot(path: string): NginxLocationConf {
    this.addBlock('root', path);

    return this;
  }

  public getLocationNginxConf(path: string = '/'): string {
    const nginxConf = new NginxConf();

    nginxConf.addLocation(path, this);

    return nginxConf.getNginxConf();
  }

  public clone(): NginxLocationConf {
    return new NginxLocationConf(this.config);
  }
}
