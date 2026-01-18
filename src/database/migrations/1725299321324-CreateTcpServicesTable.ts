import { MigrationInterface, QueryRunner } from 'typeorm';
import { addColumnIfMissing } from '../../utils/migration-helpers';

export class CreateTcpServicesTable1725299321324 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tcp_services" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar(40) NOT NULL,
        "domain" varchar(40),
        "proto" varchar NOT NULL DEFAULT ('tcp'),
        "backendHost" varchar,
        "backendPort" integer NOT NULL,
        "port" integer NOT NULL,
        "ssl" boolean NOT NULL DEFAULT (0),
        "nodeId" integer NOT NULL,
        "enabled" boolean NOT NULL DEFAULT (1),
        "allowedIps" json,
        "blockedIps" json,
        "expiresAt" datetime,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UX_tcp_services_port_unique" UNIQUE ("port"),
        CONSTRAINT "FX_tcp_services_node" FOREIGN KEY ("nodeId") REFERENCES "nodes" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "tcp_service_port_unique" ON "tcp_services" ("backendPort", "backendHost", "nodeId");`,
    );

    await addColumnIfMissing(
      queryRunner,
      'tcp_services',
      `"expiresAt" datetime`,
      'expiresAt',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "http_services";`);
  }
}
