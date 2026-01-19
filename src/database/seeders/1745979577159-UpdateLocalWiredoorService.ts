import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLocalWiredoorService1745979577159 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE "http_services"
        SET "backendHost" = '127.0.0.1'
        WHERE "name" = 'Wiredoor_APP' AND "backendHost" = 'localhost'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE "http_services"
        SET "backendHost" = 'localhost'
        WHERE "name" = 'Wiredoor_APP' AND "backendHost" = '127.0.0.1'
    `);
  }
}
