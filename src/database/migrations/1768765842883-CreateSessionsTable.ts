import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSessionsTable1768765842883 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "sessions" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "sid_hash" varchar NOT NULL,
        "user_id" integer NOT NULL,
        "remember_me" boolean NOT NULL DEFAULT (0),
        "expires_at" datetime NOT NULL,
        "revoked_at" datetime,
        "last_seen_at" datetime,
        "ip" varchar,
        "user_agent" varchar,
        "device_id" varchar,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_sessions_sid_hash" UNIQUE ("sid_hash"),
        CONSTRAINT "FK_sessions_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_user_id" ON "sessions" ("user_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_expires_at" ON "sessions" ("expires_at");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_sessions_device_id" ON "sessions" ("device_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_expires_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_sessions_user_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "sessions";`);
  }
}
