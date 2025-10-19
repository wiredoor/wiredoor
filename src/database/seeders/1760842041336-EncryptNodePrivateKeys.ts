import { MigrationInterface, QueryRunner } from 'typeorm';
import { decrypt, encrypt } from '../../utils/cypher';

export class EncryptNodePrivateKeys1760842041336 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const nodes = await queryRunner.query(`
      SELECT id, privateKey
      FROM "nodes"
    `);

    for (const node of nodes) {
      if (!node.privateKey || node.privateKey.includes('==.')) {
        continue;
      }

      const encrypted = encrypt(node.privateKey);
      await queryRunner.query(
        `
        UPDATE "nodes"
        SET "privateKey" = $1
        WHERE id = $2
        `,
        [encrypted, node.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const nodes = await queryRunner.query(`
      SELECT id, privateKey
      FROM "nodes"
    `);

    for (const node of nodes) {
      if (!node.privateKey || !node.privateKey.includes('==.')) {
        continue;
      }

      const decrypted = decrypt(node.privateKey);
      await queryRunner.query(
        `
        UPDATE "nodes"
        SET "privateKey" = $1
        WHERE id = $2
        `,
        [decrypted, node.id],
      );
    }
  }
}
