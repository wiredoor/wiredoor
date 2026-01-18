import Container from 'typedi';
import { DataSource } from 'typeorm';
import { Logger } from '../logger';

import dataSource from '../database/datasource';

export default async (): Promise<DataSource> => {
  try {
    if (!dataSource || !dataSource.isInitialized) {
      await dataSource.initialize();
      await dataSource.runMigrations();
    }

    Container.set('dataSource', dataSource);

    return dataSource;
  } catch (e: Error | any) {
    Logger.error('Unable to load database:', e);
    throw e;
  }
};
