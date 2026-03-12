import { MigrationInterface, QueryRunner } from 'typeorm';
import { addColumnIfMissing } from '../../utils/migration-helpers';

export class AddNewColumnsToNodesTable1771472158389 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfMissing(
      queryRunner,
      'nodes',
      `"connectedAt" datetime`,
      'connectedAt',
    );
    await addColumnIfMissing(
      queryRunner,
      'nodes',
      `"disconnectedAt" datetime`,
      'disconnectedAt',
    );
    await addColumnIfMissing(queryRunner, 'nodes', `"mtu" integer`, 'mtu');
    await addColumnIfMissing(
      queryRunner,
      'nodes',
      `"cliVersion" varchar(40)`,
      'cliVersion',
    );
    await addColumnIfMissing(
      queryRunner,
      'nodes',
      `"externalId" varchar(255)`,
      'externalId',
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_nodes_external_id"
      ON "nodes" ("externalId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_http_resources_external_id"`,
    );
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "connectedAt";`);
    await queryRunner.query(
      `ALTER TABLE "nodes" DROP COLUMN "disconnectedAt";`,
    );
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "mtu";`);
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "externalId";`);
  }
}
