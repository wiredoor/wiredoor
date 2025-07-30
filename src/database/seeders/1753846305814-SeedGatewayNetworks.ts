import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedGatewayNetworks1753846305814 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const nodes = await queryRunner.query(`
      SELECT id, "gatewayNetwork"
      FROM "nodes"
      WHERE "gatewayNetwork" IS NOT NULL
    `);

    for (const node of nodes) {
      const gatewayNetworks = [
        {
          interface: 'eth0',
          subnet: node.gatewayNetwork,
        },
      ];

      await queryRunner.query(
        `
        UPDATE "nodes"
        SET "gatewayNetworks" = $1
        WHERE id = $2
        `,
        [JSON.stringify(gatewayNetworks), node.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const nodes = await queryRunner.query(`
      SELECT id, "gatewayNetworks"
      FROM "node"
      WHERE "gatewayNetworks" IS NOT NULL
    `);

    for (const node of nodes) {
      let subnet: string | null = null;

      try {
        const arr = JSON.parse(node.gatewayNetworks);
        if (Array.isArray(arr) && arr.length > 0) {
          subnet = arr[0].subnet;
        }
      } catch {
        continue;
      }

      await queryRunner.query(
        `
        UPDATE "node"
        SET "gatewayNetwork" = $1
        WHERE id = $2
        `,
        [subnet, node.id],
      );
    }
  }
}
