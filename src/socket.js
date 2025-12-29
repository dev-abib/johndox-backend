// src/socket.js
const jwt = require("jsonwebtoken");
const { user } = require("./Schema/user.schema");
const redisClient = require("./Utils/redis");
const {
  addUser,
  removeUser,
  isUserOnline,
  getUserSockets,
} = require("./Utils/users.status");

module.exports = function initSocket(io) {
  io.on("connection", async (socket) => {
    const token = socket.handshake.query.token;
    let userId;

    if (!token) {
      console.log("No token provided.");
      socket.disconnect();
      return;
    }

    try {
      const verifiedPayload = jwt.verify(token, process.env.SECRET_KEY);
      userId = verifiedPayload.userData.userId;
      socket.userId = userId;
    } catch (err) {
      console.log("Authentication error", err);
      socket.disconnect();
      return;
    }

    console.log(`New connection: User ${userId} | Socket ID: ${socket.id}`);

    // === FIX: Join user-specific room ===
    socket.join(userId);

    // Add to online map (still useful for isUserOnline check)
    addUser(userId, socket.id);

    // Update online status on first connection
    const sockets = getUserSockets(userId);
    if (sockets.length === 1) {
      await user.findByIdAndUpdate(userId, { isOnline: true });
      io.emit("user-status-change", { userId, isOnline: true });
    }

    // Deliver offline messages
    try {
      if (redisClient.isOpen) {
        const messages = await redisClient.lRange(userId.toString(), 0, -1);
        if (messages.length > 0) {
          // Send to ALL user's tabs via room
          messages.forEach((msgStr) => {
            const msg = JSON.parse(msgStr);
            io.to(userId).emit("receive-message", msg);
            console.log(msg);
          });
          await redisClient.del(userId.toString());
        }
      }
    } catch (err) {
      console.error("Error delivering offline messages:", err);
    }

    socket.on("disconnect", async () => {
      console.log(`User ${userId} disconnected | Socket ID: ${socket.id}`);

      removeUser(userId, socket.id);

      if (!isUserOnline(userId)) {
        await user.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        });
        io.emit("user-status-change", { userId, isOnline: false });
      }
    });

    socket.on("ping", (data) => {
      socket.emit("pong", { timestamp: Date.now(), ...data });
    });
  });
};
