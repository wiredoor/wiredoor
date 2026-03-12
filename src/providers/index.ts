import db from './db';
import initializer from './initializer';
import expressProvider from './express';
import express from 'express';
import dns from './dns';
import iac from './iac';

export default async (expressApp: express.Application): Promise<void> => {
  await db();

  await dns();

  await initializer();

  iac();

  expressProvider({ app: expressApp });
};
