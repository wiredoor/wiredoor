import CLI from '../../utils/cli';

export class NginxManager {
  static async reloadServer(): Promise<void> {
    await CLI.exec(`nginx -s reload`);
  }
}
