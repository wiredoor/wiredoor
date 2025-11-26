import Container from 'typedi';
import { DataSource } from 'typeorm';
import { logger } from './logger';

import dataSource from '../database/datasource';

export default async (): Promise<DataSource> => {
  try {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
      await dataSource.runMigrations();
    }

    Container.set('dataSource', dataSource);

    return dataSource;
  } catch (e) {
    logger.error('Unable to load database');
    throw e;
  }
};
