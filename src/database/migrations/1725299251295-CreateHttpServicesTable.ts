import { MigrationInterface, QueryRunner } from 'typeorm';
import { addColumnIfMissing } from '../../utils/migration-helpers';

export class CreateHttpServicesTable1725299251295
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "http_services" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(40) NOT NULL,
        "domain" varchar(40),
        "pathLocation" varchar(40) NOT NULL DEFAULT ('/'),
        "backendHost" varchar,
        "backendPort" integer NOT NULL DEFAULT (80),
        "backendProto" varchar NOT NULL DEFAULT ('http'),
        "nodeId" integer NOT NULL,
        "enabled" boolean NOT NULL DEFAULT (1),
        "requireAuth" boolean NOT NULL DEFAULT (0),
        "skipAuthRoutes" text,
        "allowedIps" json,
        "blockedIps" json,
        "expiresAt" datetime,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_http_services_node" FOREIGN KEY ("nodeId") REFERENCES "nodes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "domain_path_unique" ON "http_services" ("domain", "pathLocation");`,
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "service_port_unique" ON "http_services" ("backendPort", "backendHost", "nodeId");`,
    );

    await addColumnIfMissing(
      queryRunner,
      'http_services',
      `"requireAuth" boolean NOT NULL DEFAULT (0)`,
      'requireAuth',
    );

    await addColumnIfMissing(
      queryRunner,
      'http_services',
      `"skipAuthRoutes" text`,
      'skipAuthRoutes',
    );

    await addColumnIfMissing(
      queryRunner,
      'http_services',
      `"expiresAt" datetime`,
      'expiresAt',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "http_services";`);
  }
}
