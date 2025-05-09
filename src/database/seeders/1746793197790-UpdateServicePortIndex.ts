import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateServicePortIndex1746793197790 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "service_port_unique"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "service_port_unique" ON "http_services" ("backendHost", "backendPort", "nodeId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "service_port_unique"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "service_port_unique" ON "http_services" ("backendPort", "nodeId")`,
    );
  }
}
