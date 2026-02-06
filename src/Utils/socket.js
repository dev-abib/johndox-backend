const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const redis = require("./redis");

const { Message } = require("../Schema/message.schema");
const { user } = require("../Schema/user.schema");
const { Conversation } = require("../Schema/conversation.schema");
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
    console.log("New socket connection");

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

    // Broadcast online status to all connected clients
    io.emit("presence-update", {
      userId: String(userId),
      isOnline: true,
      lastSeen: null,
    });

    // Send offline messages
    const pendingIds = await redis.lrange(offlineListKey(userId), 0, -1);
    if (pendingIds?.length) {
      const offlineMessages = await Message.find({ _id: { $in: pendingIds } })
        .populate({ path: "senderId", select: "name profilePicture" })
        .sort({ createdAt: 1 })
        .lean();
      for (const msg of offlineMessages) {
        const msgToSend = {
          ...msg,
          senderName: msg.senderId.name,
          sender: { profilePicture: msg.senderId.profilePicture },
        };
        socket.emit("receive-message", msgToSend);
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

    // Conversation seen (reset unread count)
    socket.on("conversation-seen", async ({ conversationId }) => {
      const conv = await Conversation.findById(conversationId);
      if (!conv || !conv.participants.map(String).includes(String(userId)))
        return;
      conv.unreadCount.set(String(userId), 0);
      await conv.save();
      socket.emit("conversation-updated", {
        conversationId: String(conversationId),
        unreadCount: 0,
      });
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
      console.log("User disconnected:", userId);
      await deleteUserSocket(userId);
      const now = new Date();
      await user.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: now,
        socketId: null,
      });
      // Broadcast offline status to all connected clients
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
  const { senderId, receiverId, _id, message, fileType, createdAt } =
    messageDoc;

  // Update or create conversation
  const participants = [String(senderId), String(receiverId)].sort();
  const participantsKey = participants.join("_");

  let conv = await Conversation.findOne({ participantsKey });

  let lastMessageType = "text";
  if (fileType && message) lastMessageType = "mixed";
  else if (fileType) lastMessageType = fileType;

  if (!conv) {
    conv = new Conversation({
      participants: [senderId, receiverId],
      participantsKey,
      lastMessageSender: senderId,
      unreadCount: new Map([
        [String(senderId), 0],
        [String(receiverId), 1],
      ]),
      lastMessageId: _id,
      lastMessageText: message || "",
      lastMessageType,
      lastMessageAt: createdAt,
    });
  } else {
    conv.lastMessageId = _id;
    conv.lastMessageText = message || "";
    conv.lastMessageType = lastMessageType;
    conv.lastMessageAt = createdAt;
    conv.lastMessageSender = senderId;
    const currentUnread = conv.unreadCount.get(String(receiverId)) || 0;
    conv.unreadCount.set(String(receiverId), currentUnread + 1);
    conv.unreadCount.set(String(senderId), 0);
  }

  await conv.save();

  // Build last message preview
  const lastText =
    message?.trim() ||
    (fileType === "image"
      ? "📷 Photo"
      : fileType === "video"
        ? "🎥 Video"
        : fileType === "pdf"
          ? "📄 PDF"
          : "");

  const conversationUpdateData = {
    conversationId: String(conv._id),
    lastMessage: {
      text: lastText,
      timestamp: conv.lastMessageAt,
      senderId: String(senderId),
    },
    lastMessageType,
    lastMessageAt: conv.lastMessageAt,
  };

  // Notify receiver if online
  const receiverSocket = await getUserSocket(String(receiverId));
  if (receiverSocket) {
    const sender = await user
      .findById(senderId)
      .select("firstName lastName profilePicture")
      .lean();
    const msgToSend = {
      ...messageDoc.toObject(),
      senderName: `${sender.firstName} ${sender.lastName}`,
      sender: {
        profilePicture: sender.profilePicture,
        url:
          sender?.role === "seller"
            ? "/buyerlayout/profile"
            : "/seller/profile",
      },
    };
    io.to(receiverSocket).emit("receive-message", msgToSend);
    io.to(receiverSocket).emit("conversation-updated", {
      ...conversationUpdateData,
      unreadCount: conv.unreadCount.get(String(receiverId)),
    });
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

  // Emit conversation-updated to sender
  const senderSocket = await getUserSocket(String(senderId));
  if (senderSocket) {
    io.to(senderSocket).emit("conversation-updated", {
      ...conversationUpdateData,
      unreadCount: conv.unreadCount.get(String(senderId)),
    });
  }
}

const getSocketInstance = () => io;

module.exports = { initSocket, notifyNewMessage, getSocketInstance };
