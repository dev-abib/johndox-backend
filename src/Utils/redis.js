const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT),
  password: process.env.REDIS_PASSWORD || undefined,
  enableReadyCheck: true,
  maxRetriesPerRequest: null,
});

module.exports = redis;
