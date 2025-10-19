import { MigrationInterface, QueryRunner } from 'typeorm';
import { decrypt, encrypt } from '../../utils/cypher';

export class EncryptInterfacePrivateKeys1760890411421
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const interfaces = await queryRunner.query(`
      SELECT config, privateKey
      FROM "wg_interfaces"
    `);

    for (const iface of interfaces) {
      if (!iface.privateKey || iface.privateKey.includes('==.')) {
        continue;
      }

      const encrypted = encrypt(iface.privateKey);
      await queryRunner.query(
        `
        UPDATE "wg_interfaces"
        SET "privateKey" = $1
        WHERE config = $2
        `,
        [encrypted, iface.config],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const interfaces = await queryRunner.query(`
      SELECT id, privateKey
      FROM "wg_interfaces"
    `);

    for (const iface of interfaces) {
      if (!iface.privateKey || !iface.privateKey.includes(':')) {
        continue;
      }

      const decrypted = decrypt(iface.privateKey);
      await queryRunner.query(
        `
        UPDATE "wg_interfaces"
        SET "privateKey" = $1
        WHERE id = $2
        `,
        [decrypted, iface.id],
      );
    }
  }
}
