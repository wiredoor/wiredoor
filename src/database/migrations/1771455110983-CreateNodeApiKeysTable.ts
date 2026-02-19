import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNodeApiKeysTable1771455110983 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS node_api_keys (
        "id" uuid PRIMARY KEY,
        "name" varchar(80) NOT NULL,
        "nodeId" integer NOT NULL,
        "tokenHash" varchar(64) NOT NULL,
        "expiresAt" datetime NULL,
        "revokedAt" datetime NULL,
        "lastUsedAt" datetime NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (nodeId) REFERENCES nodes(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_node_api_keys_token_hash ON node_api_keys (tokenHash);
    `);

    await queryRunner.query(`
      CREATE INDEX ix_node_api_keys_node_id ON node_api_keys (nodeId);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS ix_node_api_keys_revoked_expires
      ON node_api_keys (revokedAt, expiresAt);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS ix_node_api_keys_revoked_expires;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS ix_node_api_keys_node_id;`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_node_api_keys_token_hash;`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS node_api_keys;`);
  }
}
