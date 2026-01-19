import IP_CIDR from '../../utils/ip-cidr';
import config from '../../config';
import WGCli from '../../utils/wg-cli';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMainInterfaceSeeder1725299161636 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const privateKey = await WGCli.genPrivateKey();
    const publicKey = await WGCli.genPublicKey(privateKey);

    await queryRunner.query(`
            INSERT INTO wg_interfaces (name, config, address, subnet, port, preUp, postUp, preDown, postDown, publicKey, privateKey)
            VALUES 
            (
                'main',
                'wg0',
                '${IP_CIDR.getInterfaceIp(config.wireguard.subnet)}/24',
                '${config.wireguard.subnet}',
                '${config.wireguard.port}',
                '${config.wireguard.preUp}',
                '${config.wireguard.postUp}',
                '${config.wireguard.preDown}',
                '${config.wireguard.postDown}',
                '${publicKey}',
                '${privateKey}');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            DELETE FROM wg_interfaces WHERE config IN ('wg0');
        `);
  }
}
