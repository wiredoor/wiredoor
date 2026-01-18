import { ILogger } from '../logger'; // o la ruta local si es monorepo

declare global {
  namespace Express {
    interface Request {
      id?: string;
      logger?: ILogger;
    }
    interface Response {
      sendDataAsStream?: (data: unknown) => void;
    }
  }
}

export {};
