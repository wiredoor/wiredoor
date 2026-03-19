import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOidcProvidersTable1771745193963 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "oidc_providers" (
        "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        "type" TEXT NOT NULL,
        "name" TEXT NOT NULL,
        "issuer_url" TEXT NOT NULL,
        "client_id" TEXT NOT NULL,
        "client_secret_enc" TEXT NOT NULL,
        "scopes" TEXT NOT NULL DEFAULT 'openid profile email',
        "claim_mappings" TEXT NOT NULL DEFAULT '{}',
        "extra_params" TEXT NOT NULL DEFAULT '{}',
        "enabled" INTEGER NOT NULL DEFAULT 1,
        "rev" INTEGER NOT NULL DEFAULT 1,
        "created_at" DATETIME NOT NULL DEFAULT (datetime('now')),
        "updated_at" DATETIME NOT NULL DEFAULT (datetime('now'))
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_oidc_providers_name"
      ON "oidc_providers" ("name");
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_oidc_providers_type_issuer_client"
      ON "oidc_providers" ("type", "issuer_url", "client_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_oidc_providers_enabled"
      ON "oidc_providers" ("enabled");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_oidc_providers_issuer_url"
      ON "oidc_providers" ("issuer_url");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_oidc_providers_client_id"
      ON "oidc_providers" ("client_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_oidc_providers_name";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_oidc_providers_client_id";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_oidc_providers_issuer_url";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_oidc_providers_enabled";
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_oidc_providers_type_issuer_client";
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "oidc_providers";
    `);
  }
}
