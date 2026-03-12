import { Inject, Service } from 'typedi';
import { Logger } from '../../logger';
import { NginxFileManager } from './nginx-file-manager';
import CLI from '../../utils/cli';

export type ApplyResult = {
  success: boolean;
  paths: string[];
  error?: string;
};

export type BatchResult = {
  applied: number;
  failed: number;
  reloaded: boolean;
  results: Map<string, ApplyResult>;
};

@Service()
export class NginxManager {
  private batching = false;
  private batchResults = new Map<string, ApplyResult>();
  private needsReload = false;

  constructor(@Inject() private readonly fileManager: NginxFileManager) {}

  async testResource(
    resourceKey: string,
    writtenPaths: string[],
  ): Promise<ApplyResult> {
    if (writtenPaths.length === 0) {
      return { success: true, paths: [] };
    }

    const valid = await this.testConfig();

    if (valid) {
      const result: ApplyResult = { success: true, paths: writtenPaths };

      if (this.batching) {
        this.batchResults.set(resourceKey, result);
        this.needsReload = true;
      } else {
        // Immediate mode
        await this.reload();
      }

      Logger.info(`[nginx] Config OK for ${resourceKey}`);
      return result;
    }

    Logger.warn(`[nginx] Config FAILED for ${resourceKey}, rolling back`);

    for (const path of writtenPaths) {
      await this.fileManager.moveToError(path);
    }

    // Verify nginx is healthy again after removing bad files
    const healthyAfterRollback = await this.testConfig();

    if (!healthyAfterRollback) {
      Logger.error(
        `[nginx] CRITICAL: nginx -t still fails after rolling back ${resourceKey}. ` +
          `Manual intervention may be needed.`,
      );
    }

    const result: ApplyResult = {
      success: false,
      paths: writtenPaths,
      error: `nginx config test failed for ${resourceKey}`,
    };

    if (this.batching) {
      this.batchResults.set(resourceKey, result);
    }

    return result;
  }

  /**
   * Handle resource removal
   */
  async afterRemove(resourceKey: string): Promise<void> {
    if (this.batching) {
      this.needsReload = true;
      return;
    }

    await this.reload();
    Logger.info(`[nginx] Reloaded after removing ${resourceKey}`);
  }

  /**
   * Start batching. Reloads are deferred, but nginx -t still
   * runs per-resource for isolation.
   */
  beginBatch(): void {
    this.batching = true;
    this.batchResults = new Map();
    this.needsReload = false;
  }

  /**
   * Commit the batch: one reload for all resources that passed.
   */
  async commitBatch(): Promise<BatchResult> {
    this.batching = false;

    const applied = [...this.batchResults.values()].filter(
      (r) => r.success,
    ).length;
    const failed = [...this.batchResults.values()].filter(
      (r) => !r.success,
    ).length;

    let reloaded = false;

    if (this.needsReload && applied > 0) {
      await this.reload();
      reloaded = true;
      Logger.info(
        `[nginx] Batch commit: ${applied} applied, ${failed} failed, reloaded`,
      );
    } else if (failed > 0) {
      Logger.warn(
        `[nginx] Batch commit: ${applied} applied, ${failed} failed, no reload needed`,
      );
    }

    const results = new Map(this.batchResults);
    this.batchResults = new Map();
    this.needsReload = false;

    return { applied, failed, reloaded, results };
  }

  /**
   * Discard the batch (e.g. on transaction rollback).
   */
  discardBatch(): void {
    this.batching = false;
    this.batchResults = new Map();
    this.needsReload = false;
  }

  get isBatching(): boolean {
    return this.batching;
  }

  /**
   * Reload only. Used after removing files.
   */
  async reloadOnly(): Promise<void> {
    await this.reload();
  }

  private async testConfig(): Promise<boolean> {
    try {
      await CLI.exec('nginx -t');
      return true;
    } catch (e: any) {
      Logger.error('[nginx] Config test failed', e);
      return false;
    }
  }

  private async reload(): Promise<void> {
    await CLI.exec('nginx -s reload');
    Logger.info('[nginx] Reloaded');
  }
  static async reloadServer(): Promise<void> {
    await CLI.exec(`nginx -s reload`);
  }
}
