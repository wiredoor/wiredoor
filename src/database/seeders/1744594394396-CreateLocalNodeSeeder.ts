import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../../config';

export class CreateLocalNodeSeeder1744594394396 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const [node] = await queryRunner.query(`
        INSERT INTO nodes (name, address, gatewayNetworks, wgInterface, preSharedKey, publicKey, privateKey, allowInternet, enabled, isGateway, isLocal)
        VALUES 
        (
          'Wiredoor_Local',
          'localhost',
          NULL,
          '',
          '',
          '',
          '',
          0,
          1,
          0,
          1
        )
        RETURNING *;
    `);

    await queryRunner.query(`
      INSERT INTO http_services (name, domain, pathLocation, backendHost, backendPort, backendProto, nodeId, enabled, allowedIps, blockedIps)
      VALUES
      (
        'Wiredoor_APP',
        NULL,
        '/',
        'localhost',
        ${config.app.port},
        'http',
        ${node.id},
        1,
        NULL,
        NULL
      )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM nodes WHERE "isLocal" = 1;
    `);
  }
}
