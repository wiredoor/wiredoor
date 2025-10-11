import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateTcpServicePortIndex1760193711989
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "unique_port_per_node"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS  "tcp_service_port_unique" ON "tcp_services" ("backendHost", "backendPort", "nodeId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "tcp_service_port_unique"`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "unique_port_per_node" ON "tcp_services" ("backendPort", "nodeId")`,
    );
  }
}
