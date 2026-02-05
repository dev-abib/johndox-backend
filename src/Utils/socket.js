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
    console.log("⚡ New socket connection");

    const token = socket.handshake.query?.token;
    if (!token) return socket.disconnect();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch {
      return socket.disconnect();
    }

    const userId = decoded?.userData?.userId;
    if (!userId) return socket.disconnect();

    await setUserSocket(userId, socket.id);

    await user.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: null,
    });

    io.emit("presence-update", {
      userId: String(userId),
      isOnline: true,
      lastSeen: null,
    });

    // Send offline messages
    const pendingIds = await redis.lrange(offlineListKey(userId), 0, -1);
    if (pendingIds?.length) {
      const offlineMessages = await Message.find({ _id: { $in: pendingIds } })
        .sort({ createdAt: 1 })
        .lean();
      for (const msg of offlineMessages) {
        socket.emit("receive-message", msg);
        await Message.findByIdAndUpdate(msg._id, {
          status: "delivered",
          deliveredAt: new Date(),
        });
        const senderSocket = await getUserSocket(String(msg.senderId));
        if (senderSocket)
          io.to(senderSocket).emit("message-delivered", {
            messageId: String(msg._id),
          });
      }
      await redis.del(offlineListKey(userId));
    }

    // Typing
    socket.on("typing", async ({ receiverId }) => {
      const targetSocket = await getUserSocket(receiverId);
      if (targetSocket)
        io.to(targetSocket).emit("typing", { senderId: String(userId) });
    });

    socket.on("stop-typing", async ({ receiverId }) => {
      const targetSocket = await getUserSocket(receiverId);
      if (targetSocket)
        io.to(targetSocket).emit("stop-typing", { senderId: String(userId) });
    });

    // Message seen
    socket.on("message-seen", async ({ messageId }) => {
      const msg = await Message.findById(messageId);
      if (!msg || String(msg.receiverId) !== String(userId)) return;
      await Message.findByIdAndUpdate(messageId, {
        status: "seen",
        seenAt: new Date(),
      });
      const senderSocket = await getUserSocket(String(msg.senderId));
      if (senderSocket) io.to(senderSocket).emit("message-seen", { messageId });
    });

    // Presence
    socket.on("get-presence", async ({ targetUserId }) => {
      const target = await user
        .findById(targetUserId)
        .select("isOnline lastSeen")
        .lean();

      if (!target) return;

      let lastSeenTime = null;
      if (target.lastSeen) {
        const lastSeenDate = new Date(target.lastSeen);
        if (!isNaN(lastSeenDate.getTime()))
          lastSeenTime = lastSeenDate.getTime();
      }

      socket.emit("presence-update", {
        userId: String(targetUserId),
        isOnline: target.isOnline,
        lastSeen: lastSeenTime,
      });
    });

    // Disconnect
    socket.on("disconnect", async () => {
      console.log("❌ User disconnected:", userId);
      await deleteUserSocket(userId);
      const now = new Date();
      await user.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: now,
        socketId: null,
      });
      io.emit("presence-update", {
        userId: String(userId),
        isOnline: false,
        lastSeen: now.getTime(),
      });
    });
  });
};

async function notifyNewMessage(messageDoc) {
  if (!io) return;
  const { senderId, receiverId, _id } = messageDoc;
  const receiverSocket = await getUserSocket(String(receiverId));
  if (receiverSocket) {
    io.to(receiverSocket).emit("receive-message", messageDoc);
    await Message.findByIdAndUpdate(_id, {
      status: "delivered",
      deliveredAt: new Date(),
    });
    const senderSocket = await getUserSocket(String(senderId));
    if (senderSocket)
      io.to(senderSocket).emit("message-delivered", { messageId: String(_id) });
  } else {
    await redis.rpush(offlineListKey(receiverId), String(_id));
  }
}

const getSocketInstance = () => io;

module.exports = { initSocket, notifyNewMessage, getSocketInstance };
