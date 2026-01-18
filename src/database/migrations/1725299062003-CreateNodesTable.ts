import { MigrationInterface, QueryRunner } from 'typeorm';
import { addColumnIfMissing } from '../../utils/migration-helpers';

export class CreateNodesTable1725299062001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "nodes" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(40) NOT NULL,
        "address" varchar NOT NULL,
        "dns" varchar(40),
        "keepalive" integer NOT NULL DEFAULT (25),
        "gatewayNetwork" varchar,
        "gatewayNetworks" json,
        "wgInterface" varchar NOT NULL DEFAULT ('wg0'),
        "preSharedKey" varchar NOT NULL,
        "publicKey" varchar NOT NULL,
        "privateKey" varchar NOT NULL,
        "allowInternet" boolean NOT NULL DEFAULT (0),
        "advanced" boolean NOT NULL DEFAULT (0),
        "enabled" boolean NOT NULL DEFAULT (1),
        "isGateway" boolean NOT NULL DEFAULT (0),
        "isLocal" boolean NOT NULL DEFAULT (0),
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_nodes_address" UNIQUE ("address")
      )
    `);

    await addColumnIfMissing(queryRunner, 'nodes', `"dns" varchar(40)`, 'dns');
    await addColumnIfMissing(
      queryRunner,
      'nodes',
      `"keepalive" integer NOT NULL DEFAULT (25)`,
      'keepalive',
    );
    await addColumnIfMissing(
      queryRunner,
      'nodes',
      `"gatewayNetworks" json`,
      'gatewayNetworks',
    );
    await addColumnIfMissing(
      queryRunner,
      'nodes',
      `"advanced" boolean NOT NULL DEFAULT (0)`,
      'advanced',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_nodes_address";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "nodes";`);
  }
}
