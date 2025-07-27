import Container from 'typedi';
import path from 'path';
import config from '../config';
import { DataSource } from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import { logger } from './logger';

export default async (): Promise<DataSource> => {
  try {
    const dataSource: DataSource = new DataSource({
      ...config.db,
      synchronize: true,
      entities: [path.join(__dirname, '../database/models', '*.{ts,js}')],
      migrations: [
        // path.join(__dirname, '../database/migrations', '*.{ts,js}'),
        // only including seeders because synchronize is true
        path.join(__dirname, '../database/seeders', '*.{ts,js}'),
      ],
      migrationsTableName: 'typeorm_migrations',
      // migrationsRun: true,
      // logging: ['query', 'error'],
      // logger: 'advanced-console',
    } as MysqlConnectionOptions | SqliteConnectionOptions);

    await dataSource.initialize();
    await dataSource.runMigrations();

    Container.set('dataSource', dataSource);

    return dataSource;
  } catch (e) {
    logger.error('Unable to load database');
    throw e;
  }
};
