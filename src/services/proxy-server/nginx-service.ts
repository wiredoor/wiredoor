import FileManager from '../../utils/file-manager';
import CLI from '../../utils/cli';
import { Chain, Target } from '../../utils/iptables';
import Iptables from '../../utils/iptables';
import { HttpService } from '../../database/models/http-service';
import { TcpService } from '../../database/models/tcp-service';
import { NginxLocationConf } from './conf/nginx-location-conf';
import { Logger } from '../../logger';

export abstract class NginxService {
  protected async saveFile(path: string, content: string): Promise<void> {
    await FileManager.saveToFile(path, content);
  }

  protected async removeFile(path: string): Promise<void> {
    await FileManager.removeFile(path);
  }

  protected async removeDir(path: string): Promise<void> {
    await FileManager.removeDir(path);
  }

  protected async renameFile(oldPath: string, newPath: string): Promise<void> {
    await FileManager.rename(oldPath, newPath);
  }

  protected async reloadNginx(): Promise<void> {
    await CLI.exec('nginx -s reload');
  }

  protected async testConfig(): Promise<boolean> {
    try {
      await CLI.exec('nginx -t');
      return true;
    } catch (e: Error | any) {
      Logger.error('NGINX config test failed', e);
      return false;
    }
  }

  protected async checkAndReload(
    confFile: string,
    restart = true,
  ): Promise<boolean> {
    const valid = await this.testConfig();

    if (!valid) {
      Logger.warn(`Nginx config test failed for ${confFile}`);
      await this.renameFile(confFile, `${confFile}.err`);
      Logger.warn(
        `Nginx config ${confFile} moved to ${confFile}.err to avoid errors`,
      );
      return false;
    }

    if (restart) {
      await this.reloadNginx();
    }

    return true;
  }

  protected getLocationFile(domain?: string, path = '/'): string {
    const basePath = `/etc/nginx/locations/${domain && domain !== '_' ? domain : 'default'}`;
    FileManager.mkdirSync(basePath);

    let transformed = path.replace(/^\//, '');
    transformed =
      transformed === '' ? '__main' : transformed.replace(/\//g, '-');

    return `${basePath}/${transformed}.conf`;
  }

  protected async addDefaultMainLocation(domain?: string): Promise<string> {
    const locationFile = this.getLocationFile(domain, '/');
    if (!FileManager.isPath(locationFile)) {
      const defaultLocationConf = new NginxLocationConf();

      defaultLocationConf.setRoot('/etc/nginx/default_pages');

      const conf = defaultLocationConf.getLocationNginxConf('/');

      await this.saveFile(locationFile, conf);

      return conf;
    }
  }

  protected async resetTCPConnections(
    service: HttpService | TcpService,
  ): Promise<void> {
    try {
      const rule = {
        chain: Chain.OUTPUT,
        outInterface: service.node.wgInterface,
        destination: service.node.address,
        protocol: 'tcp',
        dport: `${service.backendPort}`,
        target: Target.REJECT,
        args: { '--reject-with': 'tcp-reset' },
      };

      Iptables.addRule(rule);
      Iptables.deleteRule(rule);

      await CLI.exec(
        `conntrack -D -p tcp --dst ${service.node.address} --dport ${service.backendPort}`,
      );
    } catch (err: Error | any) {
      Logger.warn('Unable to reset TCP connection:', err);
    }
  }
}
