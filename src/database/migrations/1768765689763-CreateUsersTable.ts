import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1768765689763 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "email" varchar NOT NULL,
        "name" varchar NOT NULL,
        "password" varchar NOT NULL,
        "active" boolean NOT NULL DEFAULT (1),
        "isAdmin" boolean NOT NULL DEFAULT (0),
        "mustChangePassword" boolean NOT NULL DEFAULT (0),
        "totpEnabled" boolean NOT NULL DEFAULT (1),
        "totpSecret" varchar,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_users_email";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
