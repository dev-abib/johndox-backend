const redis = require("./redis");

const socketKey = (userId) => `user:${userId}:socket`;

const setUserSocket = async (userId, socketId) => {
  await redis.set(socketKey(userId), socketId, "EX", 60 * 60 * 24); // 24h TTL
};

const getUserSocket = async (userId) => {
  return redis.get(socketKey(userId));
};

const deleteUserSocket = async (userId) => {
  await redis.del(socketKey(userId));
};

module.exports = { setUserSocket, getUserSocket, deleteUserSocket };
