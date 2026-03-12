import { Inject, Service } from 'typedi';
import { NginxResourceAdapter } from './nginx-resource-adapter';
import { HttpResource } from '../../database/models/http-resource';
import { HttpConfigCompiler } from './compilers/http-config-compiler';
import { NginxFileManager } from './nginx-file-manager';
import { ApplyResult, NginxManager } from './nginx-manager';

@Service()
export class NginxHttpResource {
  private readonly nginx: NginxResourceAdapter<HttpResource>;

  constructor(
    @Inject() readonly fileManager: NginxFileManager,
    @Inject() readonly nginxManager: NginxManager,
  ) {
    const compiler = new HttpConfigCompiler();

    this.nginx = new NginxResourceAdapter<HttpResource>(
      compiler,
      fileManager,
      nginxManager,
    );
  }

  async initialize(resources: HttpResource[]): Promise<void> {
    for (const resource of resources) {
      await this.create(resource);
    }
  }

  async create(resource: HttpResource): Promise<ApplyResult> {
    const result = await this.nginx.apply(resource);

    // handle result

    return result;
  }

  async remove(resource: HttpResource): Promise<void> {
    await this.nginx.remove(resource);

    // handle result
  }
}
