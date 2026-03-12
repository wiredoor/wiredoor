import { ConfigFragment, NginxCompiler } from './compilers/nginx-compiler';
import { NginxFileManager } from './nginx-file-manager';
import { NginxManager, ApplyResult } from './nginx-manager';

export class NginxResourceAdapter<TResource> {
  constructor(
    private readonly compiler: NginxCompiler<TResource>,
    private readonly fileManager: NginxFileManager,
    private readonly nginxManager: NginxManager,
  ) {}

  /**
   * Compile, write, test, and (maybe) reload.
   *
   * Returns the apply result so the caller knows if it succeeded.
   * A failure here does NOT throw. It returns { success: false }.
   * Other resources are not affected.
   */
  async apply(resource: TResource): Promise<ApplyResult> {
    const key = this.compiler.getResourceKey(resource);
    const fragments = this.compiler.compile(resource);

    if (fragments.length === 0) {
      return { success: true, paths: [] };
    }

    // Write files
    const paths = await this.fileManager.writeFragments(fragments);

    // Test THIS resource's config (immediate, not deferred)
    return this.nginxManager.testResource(key, paths);
  }

  /**
   * Remove config files and reload.
   */
  async remove(resource: TResource): Promise<void> {
    const key = this.compiler.getResourceKey(resource);
    const fragments = this.compiler.getFragmentPaths(resource);
    await this.fileManager.removeFragments(fragments);
    await this.compiler.onDeleted(resource);
    await this.nginxManager.afterRemove(key);
  }

  /**
   * Compile without writing for preview/debug.
   */
  preview(resource: TResource): ConfigFragment[] {
    return this.compiler.compile(resource);
  }
}
