import path from 'path';
import axios from 'axios';
import { randomBytes } from 'crypto';
import { setTimeout as delay } from 'timers/promises';
import config from '../config';
import FileManager from './file-manager';

export default class ServerUtils {
  static getLogsDir(domain: string): string {
    const dom = !domain || domain == '_' ? 'default' : domain;
    return path.join(config.nginx.logs, dom);
  }

  static getLogFilePath(domain: string, logFile: string): string {
    const dir = this.getLogsDir(domain);

    FileManager.mkdirSync(dir);

    return path.join(dir, logFile);
  }

  static async verifyDomainHttp01(domain: string): Promise<boolean> {
    const webroot = '/var/www/wiredoor-verify';
    const wellKnownPath = '.well-known/wiredoor-verify';

    const token = randomBytes(16).toString('hex');
    const challengePath = path.join(webroot, wellKnownPath);

    FileManager.mkdirSync(challengePath);

    const tokenPath = path.join(challengePath, token);

    try {
      await FileManager.saveToFile(tokenPath, token, 'utf-8', 0o644);

      await delay(150);

      const { data } = await axios.get(
        `http://${domain}/${wellKnownPath}/${encodeURIComponent(token)}`,
        {
          timeout: 3000,
          responseType: 'text',
          validateStatus: (s) => s >= 200 && s < 300,
        },
      );

      if (!data) {
        return false;
      }

      const text = data.trim();

      return text === token;
    } catch {
      return false;
    } finally {
      await FileManager.removeFile(tokenPath);
    }
  }
}
