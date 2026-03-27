import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateHttpServiceBackendTargetIndex1760193711990
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "service_port_unique"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "service_port_unique" ON "http_services" ("backendPort", "backendHost", "nodeId")`,
    );
  }
}
