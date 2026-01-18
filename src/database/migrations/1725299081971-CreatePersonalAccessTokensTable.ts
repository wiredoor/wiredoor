import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePersonalAccessTokensTable1725299081971
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "personal-access-tokens" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(40) NOT NULL,
        "expireAt" datetime,
        "revoked" boolean NOT NULL DEFAULT (0),
        "nodeId" integer NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "personal-access-tokens";`);
  }
}
