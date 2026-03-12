import { Service } from 'typedi';
import FileManager from '../../utils/file-manager';
import { Logger } from '../../logger';
import { ConfigFragment } from './compilers/nginx-compiler';

const NGINX_BASE = '/etc/nginx';

const SCOPE_DIRS: Record<ConfigFragment['scope'], string> = {
  domain: `${NGINX_BASE}/conf.d`,
  'http-zones': `${NGINX_BASE}/zones`,
  'http-locations': `${NGINX_BASE}/locations`,
  stream: `${NGINX_BASE}/streams`,
};

@Service()
export class NginxFileManager {
  resolvePath(fragment: ConfigFragment): string {
    const baseDir = SCOPE_DIRS[fragment.scope];
    return `${baseDir}/${fragment.relativePath}`;
  }

  /**
   * Write a config fragment to disk.
   * Creates parent directories if needed.
   */
  async writeFragment(fragment: ConfigFragment): Promise<string> {
    const path = this.resolvePath(fragment);
    const dir = path.substring(0, path.lastIndexOf('/'));

    FileManager.mkdirSync(dir);
    await FileManager.saveToFile(path, fragment.content);

    Logger.debug(
      `[nginx-files] Wrote ${path} (${fragment.content.length} bytes)`,
    );
    return path;
  }

  /**
   * Write multiple fragments. Returns all paths written.
   */
  async writeFragments(fragments: ConfigFragment[]): Promise<string[]> {
    const paths: string[] = [];

    for (const fragment of fragments) {
      const path = await this.writeFragment(fragment);
      paths.push(path);
    }

    return paths;
  }

  /**
   * Remove a config fragment from disk.
   * Silently ignores if file doesn't exist.
   */
  async removeFragment(fragment: ConfigFragment): Promise<void> {
    const path = this.resolvePath(fragment);

    try {
      await FileManager.removeFile(path);
      Logger.debug(`[nginx-files] Removed ${path}`);
    } catch {
      // Silently ignores if file doesn't exist.
    }
  }

  /**
   * Remove multiple fragments.
   */
  async removeFragments(fragments: ConfigFragment[]): Promise<void> {
    for (const fragment of fragments) {
      await this.removeFragment(fragment);
    }
  }

  /**
   * Move a file to .err (used when nginx -t fails).
   */
  async moveToError(path: string): Promise<void> {
    try {
      await FileManager.rename(path, `${path}.err`);
      Logger.warn(`[nginx-files] Moved ${path} → ${path}.err`);
    } catch {
      // Silently ignores if file doesn't exist.
    }
  }
}
