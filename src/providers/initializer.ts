import Container from 'typedi';
import WireguardService from '../services/wireguard/wireguard-service';
import { HttpServicesService } from '../services/http-services-service';
import { TcpServicesService } from '../services/tcp-services-service';
import { DomainsService } from '../services/domains-service';
import { NginxManager } from '../services/proxy-server/nginx-manager';
import { Logger } from '../logger';

export default async (): Promise<void> => {
  try {
    await Container.get(WireguardService).initialize();
  } catch (e: Error | any) {
    Logger.warn('Unable to initialize VPN server:', e);
  }

  try {
    await Container.get(DomainsService).initialize();
  } catch (e: Error | any) {
    Logger.error('Unable to initialize Domains:', e);
  }

  try {
    await Container.get(HttpServicesService).initialize();
  } catch (e: Error | any) {
    Logger.error('Unable to initialize HTTP Services:', e);
  }

  try {
    await Container.get(TcpServicesService).initialize();
  } catch (e: Error | any) {
    Logger.error('Unable to initialize TCP Services:', e);
  }

  await NginxManager.reloadServer();
};
