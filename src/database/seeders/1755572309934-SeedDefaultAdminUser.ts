import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../../config';

type SeedDef = {
  roles: Array<{ name: string; description?: string }>;
  permissions: Array<{ action: string; subject: string }>;
  grants: Array<{ role: string; action: string; subject: string }>;
};

const seed: SeedDef = {
  roles: [{ name: 'admin', description: 'Full access' }],

  permissions: [{ action: 'manage', subject: 'all' }],

  grants: [
    // admin
    { role: 'admin', action: 'manage', subject: 'all' },

    // operator
    { role: 'operator', action: 'list', subject: 'Node' },
    { role: 'operator', action: 'create', subject: 'Node' },
    { role: 'operator', action: 'update', subject: 'Node' },
    { role: 'operator', action: 'list', subject: 'Domain' },
    { role: 'operator', action: 'create', subject: 'Domain' },
    { role: 'operator', action: 'update', subject: 'Domain' },
    { role: 'operator', action: 'list', subject: 'HTTPService' },
    { role: 'operator', action: 'create', subject: 'HTTPService' },
    { role: 'operator', action: 'update', subject: 'HTTPService' },
    { role: 'operator', action: 'delete', subject: 'HTTPService' },
    { role: 'operator', action: 'list', subject: 'TCPService' },
    { role: 'operator', action: 'create', subject: 'TCPService' },
    { role: 'operator', action: 'update', subject: 'TCPService' },
    { role: 'operator', action: 'delete', subject: 'TCPService' },

    // viewer
    { role: 'viewer', action: 'list', subject: 'Node' },
    { role: 'viewer', action: 'list', subject: 'HTTPService' },
    { role: 'viewer', action: 'list', subject: 'TCPService' },
  ],
};

export class SeedDefaultAdminUser1755572309934 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const roleMap = new Map<string, number>();
    for (const role of seed.roles) {
      const [r] = await queryRunner.query(`
        INSERT INTO nodes (name, description)
        VALUES 
        (
          '${role.name}',
          '${role.description}',
        )
        RETURNING *;
      `);
      roleMap.set(role.name, r.id);
    }
    await queryRunner.query(`
      INSERT INTO users (email, firstName, lastName, password, active, isAdmin, totpEnabled, totpSecret)
      VALUES 
      (
        '${config.admin.email}',
        'Admin',
        'Default',
        '${config.admin.password}',
        1,
        1,
        0,
        NULL
      )
      RETURNING *;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM users WHERE "email" = "${config.admin.email}";
    `);
  }
}
