import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWgInterfacesTable1725298396690
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "wg_interfaces" (
        "config" varchar PRIMARY KEY NOT NULL,
        "name" varchar NOT NULL,
        "address" varchar NOT NULL,
        "subnet" varchar NOT NULL,
        "port" varchar NOT NULL,
        "preUp" varchar NOT NULL,
        "postUp" varchar NOT NULL,
        "preDown" varchar NOT NULL,
        "postDown" varchar NOT NULL,
        "publicKey" varchar NOT NULL,
        "privateKey" varchar NOT NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    queryRunner.dropTable('wg_interfaces');
  }
}
