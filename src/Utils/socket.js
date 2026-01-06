const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const redis = require("./redis");
const { Message } = require("../Schema/message.schema");
const { user } = require("../Schema/user.schema");
const {
  setUserSocket,
  getUserSocket,
  deleteUserSocket,
} = require("./socketStore");

let io;

const offlineListKey = (userId) => `user:${userId}:offlineMessageIds`;

const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", async (socket) => {
    const token = socket.handshake.query?.token;
    if (!token) {
      socket.emit("error", "Token missing");
      socket.disconnect();
      return;
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (e) {
      socket.emit("error", "Token expired or invalid");
      socket.disconnect();
      return;
    }

    const userId = decoded?.userData?.userId;
    if (!userId) {
      socket.emit("error", "Invalid token payload");
      socket.disconnect();
      return;
    }

    // save socket in redis (scalable)
    await setUserSocket(userId, socket.id);

    // user online update
    await user.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
    });

    // ✅ broadcast that this user is now online
    socket.broadcast.emit("user-online", { userId: String(userId) });

    // flush offline message IDs
    (async () => {
      const ids = await redis.lrange(offlineListKey(userId), 0, -1);
      if (!ids?.length) return;

      const messages = await Message.find({ _id: { $in: ids } })
        .sort({ createdAt: 1 })
        .lean();

      for (const msg of messages) {
        socket.emit("receive-message", msg);

        if (msg.status === "pending") {
          await Message.findByIdAndUpdate(msg._id, {
            status: "delivered",
            deliveredAt: new Date(),
          });

          const senderSocket = await getUserSocket(String(msg.senderId));
          if (senderSocket) {
            io.to(senderSocket).emit("message-delivered", {
              messageId: msg._id,
            });
          }
        }
      }

      await redis.del(offlineListKey(userId));
    })();

    // typing
    socket.on("typing", async ({ receiverId }) => {
      const receiverSocket = await getUserSocket(String(receiverId));
      if (receiverSocket)
        io.to(receiverSocket).emit("typing", { senderId: String(userId) });
    });

    socket.on("stop-typing", async ({ receiverId }) => {
      const receiverSocket = await getUserSocket(String(receiverId));
      if (receiverSocket)
        io.to(receiverSocket).emit("stop-typing", { senderId: String(userId) });
    });

    // delivered receipt from client
    socket.on("message-delivered", async ({ messageId }) => {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      if (String(msg.receiverId) !== String(userId)) return;

      await Message.findByIdAndUpdate(messageId, {
        status: "delivered",
        deliveredAt: new Date(),
      });

      const senderSocket = await getUserSocket(String(msg.senderId));
      if (senderSocket)
        io.to(senderSocket).emit("message-delivered", { messageId });
    });

    // seen receipt from client
    socket.on("message-seen", async ({ messageId }) => {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      if (String(msg.receiverId) !== String(userId)) return;

      await Message.findByIdAndUpdate(messageId, {
        status: "seen",
        seenAt: new Date(),
      });

      const senderSocket = await getUserSocket(String(msg.senderId));
      if (senderSocket) io.to(senderSocket).emit("message-seen", { messageId });
    });

    socket.on("disconnect", async () => {
      await deleteUserSocket(userId);

      const lastSeen = Date.now();

      await user.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen,
        socketId: null,
      });

      // ✅ broadcast that this user is now offline
      socket.broadcast.emit("user-offline", {
        userId: String(userId),
        lastSeen,
      });
    });
  });
};

module.exports = {
  initSocket,
  getSocketInstance: () => io,
};
