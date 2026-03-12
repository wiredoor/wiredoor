import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateHttpUpstreamsTable1771818502235 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "http_upstreams" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,

        "type" TEXT NOT NULL DEFAULT ('prefix'),
        "pathPattern" TEXT NOT NULL DEFAULT ('/'),
        "rewrite" TEXT NULL,

        "targetProtocol" TEXT NOT NULL DEFAULT ('http'),
        "targetHost" TEXT NOT NULL DEFAULT ('localhost'),
        "targetPort" integer NOT NULL,

        "targetSslVerify" boolean NOT NULL DEFAULT (0),

        "targetNodeId" integer,
        "httpResourceId" integer NOT NULL,

        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),

        CONSTRAINT "FK_http_upstream_target_node"
          FOREIGN KEY ("targetNodeId") REFERENCES "nodes" ("id")
          ON DELETE CASCADE ON UPDATE NO ACTION,

        CONSTRAINT "FK_http_upstream_http_resource"
          FOREIGN KEY ("httpResourceId") REFERENCES "http_resources" ("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_http_upstreams_httpResourceId" ON "http_upstreams" ("httpResourceId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_http_upstreams_targetNodeId" ON "http_upstreams" ("targetNodeId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_http_upstreams_targetNodeId"`);
    await queryRunner.query(`DROP INDEX "IDX_http_upstreams_httpServiceId"`);
    await queryRunner.query(`DROP TABLE "http_upstreams"`);
  }
}
