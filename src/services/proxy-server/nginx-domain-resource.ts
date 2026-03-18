import { Inject, Service } from 'typedi';
import { NginxResourceAdapter } from './nginx-resource-adapter';
import { Domain } from '../../database/models/domain';
import { NginxFileManager } from './nginx-file-manager';
import { ApplyResult, NginxManager } from './nginx-manager';
import { DomainConfigCompiler } from './compilers/domain-config-compiler';
import { SSLManager } from './ssl-manager';
import FileManager from '../../utils/file-manager';
import { SSLTermination } from '../../schemas/domain-schemas';
import ServerUtils from '../../utils/server';

@Service()
export class NginxDomainResource {
  private readonly nginx: NginxResourceAdapter<Domain>;

  constructor(
    @Inject() readonly fileManager: NginxFileManager,
    @Inject() readonly nginxManager: NginxManager,
  ) {
    const compiler = new DomainConfigCompiler();

    this.nginx = new NginxResourceAdapter<Domain>(
      compiler,
      fileManager,
      nginxManager,
    );
  }

  async initialize(resources: Domain[]): Promise<void> {
    for (const resource of resources) {
      await this.create(resource);
    }
  }

  async create(resource: Domain): Promise<ApplyResult> {
    const result = await this.nginx.apply(resource);

    // handle result

    return result;
  }

  async remove(resource: Domain): Promise<void> {
    if (resource.ssl === 'self-signed') {
      const certPath = SSLManager.getCertPath(
        resource.domain,
        SSLTermination.SelfSigned,
      );

      await FileManager.removeDir(certPath);
    } else {
      await SSLManager.deleteCertbotCertificate(resource.domain);
    }

    await FileManager.removeDir(ServerUtils.getLogsDir(resource.domain));

    await this.nginx.remove(resource);

    // handle result
  }
}
