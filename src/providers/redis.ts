import Container from 'typedi';
import Redis from 'ioredis';
import config from '../config';

export const LUA_GET_OR_INIT = `
local out = {}
for i=1,#KEYS do
  local v = redis.call("GET", KEYS[i])
  if not v then
    redis.call("SET", KEYS[i], "1", "NX")
    v = redis.call("GET", KEYS[i])
  end
  out[i] = v
end
return out
`;

export default (): Redis => {
  const redis = new Redis({
    host: config.redis.host as string,
    port: +config.redis.port,
    username: config.redis.username as string,
    password: config.redis.password as string,
    db: +config.redis.db,
    enableOfflineQueue: true,
    retryStrategy() {
      return 3000;
    },
    reconnectOnError: (err: Error) => {
      if (err.message.includes('READONLY')) {
        return true;
      } else {
        return false;
      }
    },
  });

  Container.set<Redis>('redis', redis);

  return redis;
};
