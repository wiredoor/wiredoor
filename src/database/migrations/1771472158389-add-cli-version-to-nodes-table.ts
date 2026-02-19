import { MigrationInterface, QueryRunner } from 'typeorm';
import { addColumnIfMissing } from '../../utils/migration-helpers';

export class AddCliVersionToNodesTable1771472158389 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await addColumnIfMissing(
      queryRunner,
      'nodes',
      `"cliVersion" varchar(40)`,
      'cliVersion',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "nodes" DROP COLUMN "cliVersion";`);
  }
}
