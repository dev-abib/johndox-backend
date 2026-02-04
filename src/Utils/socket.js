// socket.js (FULL FIXED VERSION with improved presence & disconnect)
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const redis = require("./redis");
const { Message } = require("../Schema/message.schema");
const { Conversation } = require("../Schema/conversation.schema");
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
      return socket.disconnect();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (err) {
      socket.emit("error", "Token expired or invalid");
      return socket.disconnect();
    }

    const userId = decoded?.userData?.userId;
    if (!userId) {
      socket.emit("error", "Invalid token payload");
      return socket.disconnect();
    }

    await setUserSocket(userId, socket.id);
    await user.findByIdAndUpdate(userId, {
      isOnline: true,
      socketId: socket.id,
      lastSeen: null,
    });

    io.emit("user-online", { userId: String(userId) });

    // Offline message delivery
    (async () => {
      const messageIds = await redis.lrange(offlineListKey(userId), 0, -1);
      if (!messageIds?.length) return;

      const messages = await Message.find({ _id: { $in: messageIds } })
        .sort({ createdAt: 1 })
        .lean();

      for (const msg of messages) {
        socket.emit("receive-message", msg);
        if (msg.status === "pending") {
          await Message.findByIdAndUpdate(msg._id, {
            status: "delivered",
            deliveredAt: new Date(),
          });
          const senderSocketId = await getUserSocket(String(msg.senderId));
          if (senderSocketId) {
            io.to(senderSocketId).emit("message-delivered", {
              messageId: String(msg._id),
            });
          }
        }
      }
      await redis.del(offlineListKey(userId));
    })();

    // Heartbeat
    socket.on("heartbeat", () => {
      socket.emit("heartbeat-ack");
    });

    // Presence
    socket.on("get-presence", async ({ targetUserId }) => {
      if (!targetUserId) return;
      const target = await user
        .findById(targetUserId)
        .select("isOnline lastSeen")
        .lean();
      if (!target) return;
      socket.emit("presence-update", {
        userId: String(targetUserId),
        isOnline: target.isOnline,
        lastSeen: target.lastSeen ? new Date(target.lastSeen).getTime() : null,
      });
    });

    // Typing
    socket.on("typing", async ({ receiverId }) => {
      if (!receiverId) return;
      const targetSocket = await getUserSocket(String(receiverId));
      if (targetSocket) {
        io.to(targetSocket).emit("typing", { senderId: String(userId) });
      }
    });

    socket.on("stop-typing", async ({ receiverId }) => {
      if (!receiverId) return;
      const targetSocket = await getUserSocket(String(receiverId));
      if (targetSocket) {
        io.to(targetSocket).emit("stop-typing", { senderId: String(userId) });
      }
    });

    // Message status
    socket.on("message-delivered", async ({ messageId }) => {
      if (!messageId) return;
      const msg = await Message.findById(messageId);
      if (!msg || String(msg.receiverId) !== String(userId)) return;
      await Message.findByIdAndUpdate(messageId, {
        status: "delivered",
        deliveredAt: new Date(),
      });
      const senderSocket = await getUserSocket(String(msg.senderId));
      if (senderSocket) {
        io.to(senderSocket).emit("message-delivered", { messageId });
      }
    });

    socket.on("message-seen", async ({ messageId }) => {
      if (!messageId) return;
      const msg = await Message.findById(messageId);
      if (!msg || String(msg.receiverId) !== String(userId)) return;
      await Message.findByIdAndUpdate(messageId, {
        status: "seen",
        seenAt: new Date(),
      });
      const senderSocket = await getUserSocket(String(msg.senderId));
      if (senderSocket) {
        io.to(senderSocket).emit("message-seen", { messageId });
      }
    });

    // Conversation seen (your original logic - truncated for brevity)
    socket.on("conversation-seen", async ({ conversationId }) => {
      if (!conversationId) return;
      try {
        const conv = await Conversation.findById(conversationId);
        if (!conv) return;
        const unread = conv.unreadCount?.get(String(userId)) ?? 0;
        if (unread === 0) return;
        await Conversation.findByIdAndUpdate(conversationId, {
          $set: { [`unreadCount.${userId}`]: 0 },
        });
        const updatedConv = await Conversation.findById(conversationId)
          .populate({
            path: "lastMessageId",
            select: "senderId message fileUrl fileType createdAt",
          })
          .lean();
        const convUpdatePayload = {
          conversationId: String(conversationId),
          unreadCount: 0,
          lastMessage: {
            id: String(updatedConv.lastMessageId?._id || ""),
            senderId: String(updatedConv.lastMessageId?.senderId || ""),
            text: updatedConv.lastMessageText || "",
            type: updatedConv.lastMessageType || "text",
            fileUrl: updatedConv.lastMessageId?.fileUrl || "",
            fileType: updatedConv.lastMessageId?.fileType || "",
            timestamp: updatedConv.lastMessageAt
              ? new Date(updatedConv.lastMessageAt).getTime()
              : null,
          },
          propertyId: updatedConv.propertyId
            ? String(updatedConv.propertyId)
            : null,
        };
        socket.emit("conversation-updated", convUpdatePayload);
        const otherId = conv.participants.find(
          (p) => String(p) !== String(userId)
        );
        if (otherId) {
          const otherSocket = await getUserSocket(String(otherId));
          if (otherSocket) {
            io.to(otherSocket).emit("conversation-updated", {
              conversationId: String(conversationId),
              unreadCount: updatedConv.unreadCount?.[String(otherId)] ?? 0,
              lastMessage: convUpdatePayload.lastMessage,
            });
          }
        }
      } catch (err) {
        console.error("conversation-seen error:", err);
      }
    });

    // Disconnect - improved
    socket.on("disconnect", async (reason) => {
      console.log(`User ${userId} disconnected - reason: ${reason}`);
      await deleteUserSocket(userId);
      const now = new Date();
      await user.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: now,
        socketId: null,
      });
      io.emit("user-offline", {
        userId: String(userId),
        lastSeen: now.getTime(),
      });
    });
  });
};

async function notifyNewMessage(messageDoc) {
  if (!io) return;
  try {
    const {
      senderId,
      receiverId,
      conversationId,
      _id,
      message,
      fileUrl,
      fileType,
      createdAt,
      propertyId,
    } = messageDoc;
    const lastText =
      message?.trim() ||
      (fileType === "image"
        ? "📷 Photo"
        : fileType === "video"
          ? "🎥 Video"
          : fileType === "pdf"
            ? "📄 PDF"
            : "");
    const lastType = fileType || "text";
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessageId: _id,
      lastMessageText: lastText,
      lastMessageType: lastType,
      lastMessageAt: createdAt,
      $inc: { [`unreadCount.${receiverId}`]: 1 },
    });
    const updatedConv = await Conversation.findById(conversationId)
      .populate({
        path: "lastMessageId",
        select: "senderId message fileUrl fileType createdAt",
      })
      .lean();
    const convUpdatePayload = {
      conversationId: String(conversationId),
      unreadCount: updatedConv.unreadCount?.[String(receiverId)] ?? 1,
      lastMessage: {
        id: String(updatedConv.lastMessageId?._id),
        senderId: String(updatedConv.lastMessageId?.senderId),
        text: updatedConv.lastMessageText || "",
        type: updatedConv.lastMessageType || "text",
        fileUrl: updatedConv.lastMessageId?.fileUrl || "",
        fileType: updatedConv.lastMessageId?.fileType || "",
        timestamp: updatedConv.lastMessageAt
          ? new Date(updatedConv.lastMessageAt).getTime()
          : null,
      },
      propertyId: updatedConv.propertyId
        ? String(updatedConv.propertyId)
        : null,
    };
    const receiverSid = await getUserSocket(String(receiverId));
    if (receiverSid) {
      io.to(receiverSid).emit(
        "receive-message",
        messageDoc.toObject?.() || messageDoc
      );
      io.to(receiverSid).emit("conversation-updated", convUpdatePayload);
    } else {
      await redis.lpush(offlineListKey(receiverId), String(_id));
    }
    const senderSid = await getUserSocket(String(senderId));
    if (senderSid) {
      io.to(senderSid).emit("message-sent-ack", {
        messageId: String(_id),
      });
      io.to(senderSid).emit("conversation-updated", {
        ...convUpdatePayload,
        unreadCount: 0,
      });
    }
  } catch (err) {
    console.error("notifyNewMessage failed:", err);
  }
}

module.exports = {
  initSocket,
  getSocketInstance: () => io,
  notifyNewMessage,
};
