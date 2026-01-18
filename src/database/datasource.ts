import { DataSource } from 'typeorm';
import { MysqlConnectionOptions } from 'typeorm/driver/mysql/MysqlConnectionOptions';
import { SqliteConnectionOptions } from 'typeorm/driver/sqlite/SqliteConnectionOptions';
import path from 'path';
import config from '../config';

const dataSource: DataSource = new DataSource({
  ...config.db,
  synchronize: false,
  entities: [path.join(__dirname, './models', '*.{ts,js}')],
  migrations: [
    path.join(__dirname, './migrations', '*.{ts,js}'),
    path.join(__dirname, './seeders', '*.{ts,js}'),
  ],
  migrationsTableName: 'typeorm_migrations',
  // migrationsRun: true,
  // logging: ['query', 'error'],
  // logger: 'advanced-console',
} as MysqlConnectionOptions | SqliteConnectionOptions);
export default dataSource;
