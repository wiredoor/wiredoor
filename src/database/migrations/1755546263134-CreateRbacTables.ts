import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRbacTables1755546263134 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "permissions" (
        "id" SERIAL PRIMARY KEY
        "key" varchar(100) NOT NULL UNIQUE,
        "description" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" SERIAL PRIMARY KEY
        "name" varchar(80) NOT NULL,
        "key" varchar(100) NOT NULL UNIQUE,
        "description" text,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "role_permissions" (
        "roleId" int NOT NULL,
        "permissionId" int NOT NULL,
        PRIMARY KEY ("roleId","permissionId"),
        CONSTRAINT "fk_rp_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_rp_perm" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "userId" int NOT NULL,
        "roleId" int NOT NULL,
        PRIMARY KEY ("userId","roleId"),
        CONSTRAINT "fk_ur_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "fk_ur_role" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "user_roles";`);
    await queryRunner.query(`DROP TABLE "role_permissions";`);
    await queryRunner.query(`DROP TABLE "roles";`);
    await queryRunner.query(`DROP TABLE "permissions";`);
  }
}
