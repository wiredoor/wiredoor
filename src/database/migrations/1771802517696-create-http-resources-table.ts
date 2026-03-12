import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHttpResourcesTable1771802517696 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "http_resources" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(40) NOT NULL,
        "domain" varchar(40),
        "enabled" integer NOT NULL DEFAULT (1),
        "expiresAt" datetime,
        "oidcProviderId" integer,
        "externalId" varchar(255),
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_http_resources_external_id"
      ON "http_resources" ("externalId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_http_resources_external_id"`,
    );
    await queryRunner.query(`DROP TABLE "http_resources"`);
  }
}
