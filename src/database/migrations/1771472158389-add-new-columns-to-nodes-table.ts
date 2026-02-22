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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "connectedAt";`);
    await queryRunner.query(
      `ALTER TABLE "nodes" DROP COLUMN "disconnectedAt";`,
    );
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "mtu";`);
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "cliVersion";`);
  }
}
