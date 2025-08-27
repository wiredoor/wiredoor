import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../../config';

export class SeedDefaultAdminUser1755572309934 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO users (email, firstName, lastName, password, active, isAdmin, totpEnabled, totpSecret, role)
      VALUES 
      (
        '${config.admin.email}',
        'Admin',
        'Default',
        '${config.admin.password}',
        1,
        1,
        0,
        NULL,
        'admin'
      )
      RETURNING *;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM users WHERE "email" = "${config.admin.email}";
    `);
  }
}
