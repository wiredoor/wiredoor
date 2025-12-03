import fs, { Mode } from 'fs';
import path from 'path';
import fsPromises from 'fs/promises';
import { createLogger } from '../logger';

const logger = createLogger({ serviceName: 'FileManager' });

export default class FileManager {
  static isFile(dir: string, filename: string): boolean {
    return fs.existsSync(path.join(dir, filename));
  }

  static isPath(fileOrFolderPath: string): boolean {
    return fs.existsSync(fileOrFolderPath);
  }

  static async isDirectory(directoryPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.stat(directoryPath, (err, stats) => {
        if (err) {
          return resolve(false);
        }

        if (!stats.isDirectory()) {
          return resolve(false);
        }

        return resolve(true);
      });
    });
  }

  static mkdirSync(directoryPath: string): boolean {
    try {
      if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });

        return true;
      }

      return true;
    } catch (e: Error | any) {
      logger.error(`Error creating directory ${directoryPath}`, e);
      return false;
    }
  }

  static async listDirectories(directory: string): Promise<string[]> {
    const dirEntries = await fsPromises.readdir(directory, {
      withFileTypes: true,
    });

    const onlyDirs = dirEntries
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    return onlyDirs;
  }

  static readDirectory(dir: string): Promise<string[]> {
    return fsPromises.readdir(dir);
  }

  static readFile(filepath: string, encoding: BufferEncoding): Promise<string> {
    return fsPromises.readFile(filepath, encoding);
  }

  static readFileSync(filepath: string, encoding: BufferEncoding): string {
    return fs.readFileSync(filepath, encoding);
  }

  static readFileInDir(
    dir: string,
    filename: string,
    encoding: BufferEncoding,
  ): Promise<string> {
    return fsPromises.readFile(path.join(dir, filename), encoding);
  }

  static async saveToFile(
    file: string,
    data: string,
    encoding: BufferEncoding = 'utf8',
    mode: Mode | undefined = undefined,
  ): Promise<void> {
    await fsPromises.writeFile(file, data, {
      encoding,
      mode,
    });
  }

  static async appendToFile(
    file: string,
    data: string,
    encoding: BufferEncoding = 'utf8',
  ): Promise<void> {
    await fsPromises.appendFile(file, data, encoding);
  }

  static async rename(oldPath: string, newPath: string): Promise<void> {
    await fsPromises.rename(oldPath, newPath);
  }

  static async removeDir(dir: string): Promise<void> {
    try {
      if (this.isPath(dir)) {
        await fsPromises.rm(dir, { recursive: true, force: true });
      } else {
        logger.error(`Directory ${dir} does not exists`);
      }
    } catch (error) {
      logger.error(`Failed to delete directory: ${dir}`);
      throw error;
    }
  }

  static async removeFile(filepath: string): Promise<void> {
    try {
      if (this.isPath(filepath)) {
        await fsPromises.unlink(filepath);
      } else {
        logger.error(`File ${filepath} does not exists`);
      }
    } catch (error) {
      logger.error(`Failed to delete file: ${filepath}`);
      throw error;
    }
  }
}
