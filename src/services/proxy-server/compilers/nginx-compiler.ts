import { Logger } from '../../../logger';
import CLI from '../../../utils/cli';
import Iptables, { Chain, Target } from '../../../utils/iptables';

export type IpDirective = {
  directive: 'allow' | 'deny';
  value: string;
};

export type ConfigFragment = {
  scope: 'domain' | 'http-zones' | 'http-locations' | 'stream';
  relativePath: string;
  content: string;
};

export interface NginxCompiler<TResource> {
  getResourceKey(resource: TResource): string;
  compile(resource: TResource): ConfigFragment[];
  getFragmentPaths(resource: TResource): ConfigFragment[];
  onDeleted(resource: TResource): Promise<void>;
}

export class NginxConfigCompiler {
  protected safeDomain(domain: string): string {
    return domain === '_' ? 'default' : domain;
  }

  protected compileIpDirectives(
    rules: Array<{
      enabled?: boolean;
      action: { type: string; params?: any };
    }>,
  ): IpDirective[] {
    const directives: IpDirective[] = [];
    let hasAllow = false;

    for (const rule of rules) {
      if (rule.enabled === false) continue;
      if (rule.action.type !== 'ip.allow' && rule.action.type !== 'ip.deny')
        continue;

      const cidrs: string[] = rule.action.params?.cidrs ?? [];
      const directive = rule.action.type === 'ip.allow' ? 'allow' : 'deny';

      if (directive === 'allow') hasAllow = true;

      for (const cidr of cidrs) {
        directives.push({ directive, value: cidr });
      }
    }

    // Implicit deny all when there are allow rules
    if (
      hasAllow &&
      !directives.some((d) => d.directive === 'deny' && d.value === 'all')
    ) {
      directives.push({ directive: 'deny', value: 'all' });
    }

    return directives;
  }

  protected escapeNginxString(value: string): string {
    return value.replace(/"/g, '\\"').replace(/\$/g, '\\$');
  }

  protected sanitizeVarName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  protected async resetTCPConnections(
    iface: string,
    server: string,
    port: string | number,
  ): Promise<void> {
    try {
      const rule = {
        chain: Chain.OUTPUT,
        outInterface: iface,
        destination: server,
        protocol: 'tcp',
        dport: `${port}`,
        target: Target.REJECT,
        args: { '--reject-with': 'tcp-reset' },
      };

      Iptables.addRule(rule);
      Iptables.deleteRule(rule);

      await CLI.exec(`conntrack -D -p tcp --dst ${server} --dport ${port}`);
    } catch (err: Error | any) {
      Logger.warn('Unable to reset TCP connection:', err);
    }
  }
}
