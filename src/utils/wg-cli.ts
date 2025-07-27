import CLI from './cli';

export interface RuntimeInfo {
  publicKey: string;
  preSharedKey: string;
  endpoint?: string;
  clientIp?: string;
  allowedIps: string;
  latestHandshake: number;
  transferRx: number;
  transferTx: number;
  persistentKeepalive: number; // 0("off") or between 1 and 65535
}

export default class WGCli {
  /**
   * Generates a random private key in base64.
   *
   * @returns {Promise<string>} random private key in base64
   */
  static async genPrivateKey(): Promise<string> {
    const { stdout } = await CLI.exec('wg genkey');

    return stdout;
  }

  /**
   * Calculates a public key from a corresponding privateKey (generated with genkey).
   *
   * @param {string} privateKey
   * @returns {Promise<string>} public key from a corresponding privateKey
   */
  static async genPublicKey(privateKey: string): Promise<string> {
    const { stdout } = await CLI.exec(`echo ${privateKey} | wg pubkey`);

    return stdout;
  }

  /**
   * Generates a random preshared key in base64
   *
   * @returns {Promise<string>} random preshared key in base64
   */
  static async genPreSharedKey(): Promise<string> {
    const { stdout } = await CLI.exec('wg genpsk');

    return stdout;
  }

  /**
   * Reads back the existing configuration first and only makes changes that are explicitly
   * different between the configuration file and the interface. This is much less efficient
   * than setconf, but has the benefit of not disrupting current peer sessions.
   *
   * @param {string} cfg - Config name
   */
  static async syncConf(cfg = 'wg0'): Promise<void> {
    await CLI.exec(`wg syncconf ${cfg} <(wg-quick strip ${cfg})`);
  }

  static async quickUp(cfg = 'wg0'): Promise<void> {
    try {
      await CLI.exec(`wg-quick up ${cfg}`);
    } catch (e) {
      throw e;
    }
  }

  static async quickDown(cfg = 'wg0'): Promise<void> {
    try {
      await CLI.exec(`wg-quick down ${cfg}`);
    } catch {
      // fail to down interface
    }
  }

  static async isLink(cfg = 'wg0'): Promise<boolean> {
    try {
      await CLI.exec(`ip link show ${cfg}`);
      return true;
    } catch {
      return false;
    }
  }

  static async dumpPeerRuntimeInfo(
    peer: string,
    cfg = 'wg0',
  ): Promise<RuntimeInfo | null> {
    try {
      const { stdout } = await CLI.exec(`wg show ${cfg} dump | grep ${peer}`);

      if (!stdout) {
        return null;
      }

      const result = this.parseDumpLine(stdout);

      return result ? result : null;
    } catch (e) {
      throw e;
    }
  }

  static async dumpRunTimeInfo(cfg = 'wg0'): Promise<RuntimeInfo[]> {
    try {
      const { stdout } = await CLI.exec(`wg show ${cfg} dump`);

      if (!stdout) {
        return [];
      }

      return this.parseRuntimeDump(stdout);
    } catch (e) {
      throw e;
    }
  }

  static parseRuntimeDump(result: string): RuntimeInfo[] {
    return result
      .trim()
      .split('\n')
      .slice(1)
      .map((line) => this.parseDumpLine(line));
  }

  static parseDumpLine(line: string): RuntimeInfo {
    const [
      publicKey,
      preSharedKey,
      endpoint,
      allowedIps,
      latestHandshake,
      transferRx,
      transferTx,
      persistentKeepalive,
    ] = line.trim().split('\t');

    const clientEndpoint = endpoint === '(none)' ? null : endpoint;
    const clientUrl = clientEndpoint
      ? new URL(`http://${clientEndpoint}`)
      : null;

    return {
      publicKey,
      preSharedKey,
      endpoint: clientEndpoint,
      clientIp: clientUrl?.hostname,
      allowedIps,
      latestHandshake: parseInt(latestHandshake),
      transferRx: parseInt(transferRx),
      transferTx: parseInt(transferTx),
      persistentKeepalive:
        persistentKeepalive === 'off' ? 0 : parseInt(persistentKeepalive),
    };
  }
}
