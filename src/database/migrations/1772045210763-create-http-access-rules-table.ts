import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHttpAccessRulesTable1772045210763 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "http_access_rules" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "httpResourceId" INTEGER NOT NULL,
        "enabled" INTEGER NOT NULL DEFAULT 1,
        "order" INTEGER NOT NULL DEFAULT 1000,
        "match_type" TEXT NOT NULL,
        "pattern" TEXT NOT NULL,
        "methods" TEXT NULL,
        "action" TEXT NOT NULL,
        "predicate" TEXT NULL,
        "rev" INTEGER NOT NULL DEFAULT 1,
        "upstreamId" INTEGER NULL,
        "created_at" DATETIME NOT NULL DEFAULT (datetime('now')),
        "updated_at" DATETIME NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_http_access_rules_resource_enabled"
      ON "http_access_rules" ("httpResourceId", "enabled");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_http_access_rules_resource_match_type"
      ON "http_access_rules" ("httpResourceId", "match_type");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_http_access_rules_resource_order"
      ON "http_access_rules" ("httpResourceId", "order");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_http_access_rules_resource_pattern"
      ON "http_access_rules" ("httpResourceId", "pattern");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_http_access_rules_resource_pattern";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_http_access_rules_resource_order";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_http_access_rules_resource_match_type";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_http_access_rules_resource_enabled";`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "http_access_rules";`);
  }
}
