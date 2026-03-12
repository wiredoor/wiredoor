import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHttpEdgeRulesTable1772060640299 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "http_edge_rules" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "httpResourceId" INTEGER NOT NULL,
        "enabled" INTEGER NOT NULL DEFAULT 1,
        "order" INTEGER NOT NULL DEFAULT 1000,
        "match_type" TEXT NOT NULL,
        "pattern" TEXT NOT NULL,
        "methods" TEXT NULL,
        "action" TEXT NOT NULL,
        "upstreamId" INTEGER NULL,
        "created_at" DATETIME NOT NULL DEFAULT (datetime('now')),
        "updated_at" DATETIME NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_http_edge_rules_resource_enabled"
      ON "http_edge_rules" ("httpResourceId", "enabled");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_http_edge_rules_resource_order"
      ON "http_edge_rules" ("http_resource_id", "order");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_http_edge_rules_resource_match_type"
      ON "http_edge_rules" ("http_resource_id", "match_type");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_http_edge_rules_resource_match_type";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_http_edge_rules_resource_order";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_http_edge_rules_resource_enabled";`,
    );

    await queryRunner.query(`DROP TABLE IF EXISTS "http_edge_rules";`);
  }
}
