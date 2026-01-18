import { MigrationInterface, QueryRunner } from 'typeorm';
import { addColumnIfMissing, hasIndex } from '../../utils/migration-helpers';

export class CreateDomainsTable1725299097909 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "domains" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "domain" varchar(40) NOT NULL,
        "ssl" varchar NOT NULL DEFAULT ('self-signed'),
        "sslPair" text,
        "skipValidation" boolean NOT NULL DEFAULT (0),
        "oauth2ServicePort" integer,
        "oauth2Config" json,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await addColumnIfMissing(
      queryRunner,
      'domains',
      `"skipValidation" boolean NOT NULL DEFAULT (0)`,
      'skipValidation',
    );
    await addColumnIfMissing(
      queryRunner,
      'domains',
      `"oauth2ServicePort" integer`,
      'oauth2ServicePort',
    );
    await addColumnIfMissing(
      queryRunner,
      'domains',
      `"oauth2Config" json`,
      'oauth2Config',
    );

    const hasIndexDomain = await hasIndex(queryRunner, 'domains', 'domain');

    if (!hasIndexDomain) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UX_domain_unique" ON "domains" ("domain");
      `);
    }

    const hasIndexPort = await hasIndex(
      queryRunner,
      'domains',
      'oauth2ServicePort',
    );

    if (!hasIndexPort) {
      await queryRunner.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "UQ_domains_oauth2ServicePort" ON "domains" ("oauth2ServicePort");
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_domains_oauth2ServicePort";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "domains";`);
  }
}
