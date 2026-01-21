import { User } from '../database/models/user';
import { Session } from '../database/models/session';
import { ILogger } from '../logger'; // o la ruta local si es monorepo

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: User;
      session?: Partial<Session>;
      logger?: ILogger;
    }
    interface Response {
      sendDataAsStream?: (data: unknown) => void;
    }
  }
}

export {};
