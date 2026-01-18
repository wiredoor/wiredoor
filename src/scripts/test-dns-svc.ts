import 'reflect-metadata';
import Container from 'typedi';
import dns from '../providers/dns';
import dotenv from 'dotenv';
import { DNSService } from '../services/dns/dns-service';

dotenv.config();

(async (): Promise<void> => {
  await dns();

  console.log('DNS Provider initialized.');

  const dnsService = Container.get(DNSService);

  // const records = await dnsService.listRecords();

  // console.log('DNS Records:', records);

  const record = await dnsService.createRecord({
    name: 'test2.infladoor.com',
    type: 'A',
    content: '5.161.99.238',
    ttl: 120,
    proxied: true,
  });

  await dnsService.deleteRecord({ name: 'test2.infladoor.com', type: 'A' });

  console.log('Created and deleted DNS Record:', record);
})();
