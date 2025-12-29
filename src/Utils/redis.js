// src/Utils/redis.js  (Fixed Redis Client – v4+ requires explicit .connect())
const { createClient } = require("redis");

const redisClient = createClient({
  socket: {
    host: "127.0.0.1",
    port: 6379,
    // Optional: robust reconnect strategy
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        console.error("Redis max reconnect attempts reached");
        return new Error("Retry exhausted");
      }
      return Math.min(100 * 2 ** retries, 10000); // exponential backoff
    },
  },
});

redisClient.on("error", (err) => console.error("Redis Client Error:", err));
redisClient.on("connect", () => console.log("Redis connecting..."));
redisClient.on("ready", () => console.log("Redis connected and ready"));
redisClient.on("reconnecting", () => console.log("Redis reconnecting..."));
redisClient.on("end", () => console.log("Redis connection ended"));

// Connect once at startup (critical for v4+ – otherwise "Client is closed")
redisClient.connect().catch((err) => {
  console.error("Failed to connect to Redis on startup:", err);
});

module.exports = redisClient;
