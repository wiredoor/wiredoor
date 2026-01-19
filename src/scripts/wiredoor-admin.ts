#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'node:fs/promises';
import process from 'node:process';
import { getInitTokenPath } from '../utils/init-token';
import db from '../providers/db';
import Container from 'typedi';
import { UsersService } from '../services/users-service';

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8').trim();
}

const program = new Command();

program
  .name('wiredoor-admin')
  .description('Wiredoor server control CLI')
  .version(process.env.WIREDOOR_VERSION || 'dev');

program
  .command('get-setup-token')
  .description('Print setup token from init-token file')
  .action(async () => {
    try {
      const p = getInitTokenPath();
      const raw = await fs.readFile(p, 'utf8').catch(() => '');
      const token = raw.trim();
      if (!token) throw new Error(`Setup token not found. Expected file: ${p}`);
      process.stdout.write(token + '\n');
    } catch (e: any) {
      process.stderr.write(`ERROR: ${e?.message ?? e}\n`);
      process.exitCode = 1;
    }
  });

program
  .command('change-password')
  .description('Change user password (recommended: provide password via stdin)')
  .requiredOption('--email <email>', 'User email')
  .option('--stdin', 'Read password from stdin', true)
  .option(
    '--password <password>',
    'Password (NOT recommended; ends in shell history)',
  )
  .option('--force-change', 'User must change password on next login', false)
  .action(async (opts) => {
    try {
      const email = String(opts.email || '')
        .trim()
        .toLowerCase();
      if (!email) throw new Error('--email is required');

      let password = '';
      if (opts.password) password = String(opts.password);
      else password = await readStdin();

      if (!password || password.length < 12)
        throw new Error('Password must be at least 12 characters.');

      await db();
      await Container.get(UsersService).changePassword(
        email,
        password,
        !!opts.forceChange,
      );

      process.stdout.write('OK: password updated\n');
    } catch (e: any) {
      process.stderr.write(`ERROR: ${e?.message ?? e}\n`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv).catch((e) => {
  process.stderr.write(`FATAL: ${e?.message ?? e}\n`);
  process.exit(1);
});
