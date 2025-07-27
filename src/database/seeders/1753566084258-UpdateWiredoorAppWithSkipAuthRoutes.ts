import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateWiredoorAppWithSkipAuthRoutes1753566084258
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE "http_services"
        SET "skipAuthRoutes" = '/api/nodes\n/api/config\n^/api/(auth|cli)/.*'
        WHERE "name" = 'Wiredoor_APP' AND "backendHost" = '127.0.0.1'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE "http_services"
        SET "skipAuthRoutes" = NULL
        WHERE "name" = 'Wiredoor_APP' AND "backendHost" = '127.0.0.1'
    `);
  }
}
