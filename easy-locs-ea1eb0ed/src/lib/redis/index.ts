export {
  initRedisProxy,
  isRedisAvailable,
  redisGet,
  redisSet,
  redisDel,
  redisIncr,
  redisExpire,
  resetRedisClient,
  getRedisClient,
} from "./redis-client";

export {
  initPresenceService,
  setPresence,
  removePresence,
  getPresence,
  isUserOnline,
  getLastSeen,
  getBulkPresence,
  getActiveUserCount,
  startHeartbeat,
  stopHeartbeat,
  setTypingIndicator,
  clearTypingIndicator,
} from "./presence-service";
