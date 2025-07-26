import path from 'path';
import FileManager from '../../utils/file-manager';
import CLI from '../../utils/cli';
import { SSLTermination, SSLCerts } from '../../database/models/domain';
import config from '../../config';
import { logger } from '../../providers/logger';

const selfSignedCertificatePath = '/etc/nginx/ssl';
const opensslConf = '/etc/openssl/openssl.cnf';

export class SSLManager {
  static getSSLCertificates(
    domain: string,
    type: SSLTermination,
  ): Promise<SSLCerts> {
    if (!domain || domain === '_' || type === 'self-signed') {
      return this.getSelfSignedCertificates(domain);
    }

    return this.getCertbotCertificates(domain);
  }

  static async getSelfSignedCertificates(domain: string): Promise<SSLCerts> {
    const domainCertFolder = !domain || domain === '_' ? 'default' : domain;
    const certPath = path.join(selfSignedCertificatePath, domainCertFolder);
    if (FileManager.mkdirSync(certPath)) {
      if (
        !FileManager.isPath(`${certPath}/privkey.key`) &&
        !FileManager.isPath(`${certPath}/cert.crt`)
      ) {
        await CLI.exec(
          `openssl genpkey -algorithm RSA -out ${certPath}/privkey.key`,
        );
        await CLI.exec(
          `openssl req -new -key ${certPath}/privkey.key -out ${certPath}/wiredoor.csr -config ${opensslConf}`,
        );
        await CLI.exec(
          `openssl x509 -req -days 3650 -in ${certPath}/wiredoor.csr -signkey ${certPath}/privkey.key -out ${certPath}/cert.crt`,
        );
      }

      return {
        privkey: `${certPath}/privkey.key`,
        fullchain: `${certPath}/cert.crt`,
      };
    }
  }

  static async generateDefaultCerts(): Promise<void> {
    if (
      FileManager.mkdirSync(`/data/ssl`) &&
      FileManager.mkdirSync(selfSignedCertificatePath)
    ) {
      const defaultKey = `/data/ssl/privkey.key`;
      const defaultCert = `/data/ssl/cert.crt`;
      if (!FileManager.isPath(defaultCert) && !FileManager.isPath(defaultKey)) {
        await CLI.exec(`openssl genpkey -algorithm RSA -out ${defaultKey}`);
        await CLI.exec(
          `openssl req -new -key ${defaultKey} -out /data/ssl/default.csr -config ${opensslConf}`,
        );
        await CLI.exec(
          `openssl x509 -req -days 3650 -in /data/ssl/default.csr -signkey ${defaultKey} -out ${defaultCert}`,
        );
      }
      await CLI.exec(
        `ln -sfn ${defaultKey} ${selfSignedCertificatePath}/privkey.key`,
      );
      await CLI.exec(
        `ln -sfn ${defaultCert} ${selfSignedCertificatePath}/cert.crt`,
      );
    }
  }

  static async getCertbotCertificates(domain: string): Promise<SSLCerts> {
    const certPath = `/etc/letsencrypt/live/${domain}`;

    if (
      !FileManager.isPath(`${certPath}/privkey.pem`) &&
      !FileManager.isPath(`${certPath}/fullchain.pem`)
    ) {
      const mailOption = config.admin.email
        ? `-m ${config.admin.email}`
        : '--register-unsafely-without-email';
      const command = `certbot certonly --non-interactive --agree-tos --webroot -w /var/www/letsencrypt ${mailOption} -d ${domain}`;

      await CLI.exec(command);
    }

    return {
      privkey: `${certPath}/privkey.pem`,
      fullchain: `${certPath}/fullchain.pem`,
    };
  }

  static async deleteCertbotCertificate(domain: string): Promise<void> {
    const certPath = `/etc/letsencrypt/live/${domain}`;

    if (FileManager.isPath(`${certPath}/privkey.pem`)) {
      try {
        await CLI.exec(`certbot delete --cert-name ${domain} -n`);
      } catch (e) {
        logger.error(e);
      }
    }
  }

  static getSSLPair(
    domain: string,
    type: SSLTermination,
  ): { privkey: string; fullchain: string } {
    const certPath = this.getCertPath(domain, type);
    if (!domain || domain === '_' || type === 'self-signed') {
      return {
        privkey: `${certPath}/privkey.key`,
        fullchain: `${certPath}/cert.crt`,
      };
    } else {
      return {
        privkey: `${certPath}/privkey.pem`,
        fullchain: `${certPath}/fullchain.pem`,
      };
    }
  }

  static getCertPath(domain: string, type: SSLTermination): string {
    if (!domain || domain === '_' || type === 'self-signed') {
      const domainCertFolder = !domain || domain === '_' ? 'default' : domain;
      return path.join(selfSignedCertificatePath, domainCertFolder);
    } else {
      return `/etc/letsencrypt/live/${domain}`;
    }
  }
}
