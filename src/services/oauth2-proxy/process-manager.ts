import { Domain } from '../../database/models/domain';
import fs from 'fs';
import { randomBytes } from 'crypto';
import config from '../../config';
import CLI from '../../utils/cli';
import FileManager from '../../utils/file-manager';

const getGeneratedKey = (domain: string): string => {
  const dir = `/data/oauth2`;
  fs.mkdirSync(dir, { recursive: true });
  const filePath: string = `${dir}/.cookie-secret-${domain}`;
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8').trim();
    }
    const newKey = randomBytes(64).toString('base64').substring(0, 32);

    FileManager.saveToFile(filePath, newKey, 'utf-8', 0o600);
    return newKey;
  } catch (error) {
    console.error('Error loading or generating JWT key:', error);
    throw error;
  }
};

export class ProcessManager {
  static async addOauthProcess(
    domain: Domain,
    restart: boolean = false,
  ): Promise<void> {
    const secret = getGeneratedKey(domain.domain);

    FileManager.mkdirSync('/opt/oauth2-proxy');
    FileManager.mkdirSync(`${config.nginx.logs}/${domain.domain}`);
    const hasEmails =
      domain.oauth2Config.allowedEmails && domain.oauth2Config.allowedEmails[0];
    if (hasEmails) {
      await FileManager.saveToFile(
        `/opt/oauth2-proxy/${domain.domain}-emails`,
        domain.oauth2Config.allowedEmails.join('\n'),
        'utf-8',
        0o644,
      );
    }

    const processFile = `[program:oauth2-proxy-d${domain.id}]
command=sh -c 'source /etc/environment && /usr/bin/oauth2-proxy --skip-provider-button=true'
environment=
  OAUTH2_PROXY_HTTP_ADDRESS="127.0.0.1:${domain.oauth2ServicePort}",
  OAUTH2_PROXY_COOKIE_DOMAINS="${domain.domain}",
  OAUTH2_PROXY_COOKIE_SECRET="${secret}",
  OAUTH2_PROXY_REDIRECT_URL="https://${domain.domain}/oauth2/callback",
  ${hasEmails ? `OAUTH2_PROXY_AUTHENTICATED_EMAILS_FILE="/opt/oauth2-proxy/${domain.domain}-emails"` : ''}
autorestart=true
stopsignal=KILL
stopasgroup=true
killasgroup=true
redirect_stderr=true
redirect_stdout=true
stdout_logfile=${config.nginx.logs}/${domain.domain}/oauth2-proxy.stdout.log
stderr_logfile=${config.nginx.logs}/${domain.domain}/oauth2-proxy.stderr.log`;

    await FileManager.saveToFile(
      `/etc/supervisor/conf.d/oauth2-proxy-d${domain.id}.conf`,
      processFile,
      'utf-8',
      0o644,
    );

    if (restart) {
      await this.restart();
    }
  }

  static async removeOauthProcess(
    domain: Domain,
    restart: boolean = true,
  ): Promise<void> {
    await Promise.all([
      FileManager.removeFile(
        `/etc/supervisor/conf.d/oauth2-proxy-d${domain.id}.conf`,
      ),
      FileManager.removeFile(`/opt/oauth2-proxy/${domain.domain}-emails`),
      FileManager.removeFile(`/data/oauth2/.cookie-secret-${domain.domain}`),
    ]);

    if (restart) {
      await this.restart();
    }
  }

  static async restart(): Promise<void> {
    await CLI.exec(`supervisorctl reread && supervisorctl update`);
  }
}
