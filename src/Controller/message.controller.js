const mongoose = require("mongoose");
const { Message } = require("../Schema/message.schema");
const { Conversation } = require("../Schema/conversation.schema");
const { user } = require("../Schema/user.schema");
const { asyncHandler } = require("../Utils/asyncHandler");
const { apiError } = require("../Utils/api.error");
const { apiSuccess } = require("../Utils/api.success");
const redis = require("../Utils/redis");
const { getUserSocket } = require("../Utils/socketStore");
const { getSocketInstance, notifyNewMessage } = require("../Utils/socket");
const { decodeSessionToken } = require("../Helpers/helper");
const { uploadCloudinary } = require("../Helpers/uploadCloudinary");

const offlineListKey = (userId) => `user:${userId}:offlineMessageIds`;

const buildParticipantsKey = (a, b) => {
  const [x, y] = [String(a), String(b)].sort();
  return `${x}_${y}`;
};

const detectFileType = (mimetype) => {
  if (!mimetype) return "";
  const mt = mimetype.toLowerCase();
  if (mt.startsWith("image/")) return "image";
  if (mt.startsWith("video/")) return "video";
  if (mt === "application/pdf") return "pdf";
  return "";
};

const sendChatMessage = asyncHandler(async (req, res) => {
  const decoded = await decodeSessionToken(req);
  const senderId = decoded?.userData?.userId;

  const { receiverId } = req.params;
  const { message, propertyId } = req.body;

  if (!senderId) throw new apiError(401, "Unauthorized");
  if (!receiverId) throw new apiError(400, "Receiver ID is required");
  if (String(senderId) === String(receiverId))
    throw new apiError(400, "You cannot message yourself");

  const [sender, receiver] = await Promise.all([
    user.findById(senderId).select("firstName name"),
    user.findById(receiverId).select("_id"),
  ]);

  if (!sender) throw new apiError(404, "Sender doesn't exist");
  if (!receiver) throw new apiError(404, "Receiver doesn't exist");

  if (!message && !req.file) {
    throw new apiError(400, "Send at least a message or file");
  }

  // Handle file upload
  let fileUrl = "";
  let fileType = "";
  if (req.file) {
    fileType = detectFileType(req.file.mimetype);
    const folder =
      fileType === "image"
        ? "chat/media/images"
        : fileType === "video"
          ? "chat/media/videos"
          : "chat/media/pdfs";

    const result = await uploadCloudinary(req.file.buffer, folder, "auto");
    if (!result?.secure_url) {
      throw new apiError(500, "Failed to upload attachment");
    }
    fileUrl = result.secure_url;
  }

  // Create message
  const savedMessage = await Message.create({
    senderId,
    receiverId,
    message: message || "",
    fileUrl,
    fileType,
    status: "pending",
    propertyId: propertyId || null,
  });

  const participants = [senderId, receiverId].sort();
  const participantsKey = participants.join("_");

  const lastText =
    message?.trim() ||
    (fileType === "image"
      ? "📷 Photo"
      : fileType === "video"
        ? "🎥 Video"
        : fileType === "pdf"
          ? "📄 PDF"
          : "");

  const lastType = fileType || (message?.trim() ? "text" : "");

  await Conversation.findOneAndUpdate(
    { participantsKey },
    {
      $setOnInsert: {
        participants: [senderId, receiverId],
        participantsKey,
      },
      $set: {
        lastMessageId: savedMessage._id,
        lastMessageText: lastText,
        lastMessageType: lastType,
        lastMessageAt: savedMessage.createdAt,
        propertyId: propertyId || undefined,
      },
      $inc: { [`unreadCount.${receiverId}`]: 1 },
    },
    { upsert: true, new: true }
  );

  await notifyNewMessage(savedMessage);

  return res
    .status(200)
    .json(
      new apiSuccess(200, "Message sent successfully", savedMessage, false)
    );
});

const getConversations = asyncHandler(async (req, res, next) => {
  const decoded = await decodeSessionToken(req);
  const myId = decoded?.userData?.userId;
  if (!myId) return next(new apiError(401, "Unauthorized", null, false));

  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 50);
  const skip = (page - 1) * limit;

  const conversations = await Conversation.find({ participants: myId })
    .sort({ lastMessageAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate({ path: "propertyId", select: "propertyName price location" })
    .lean();

  if (conversations.length === 0) {
    return res
      .status(200)
      .json(
        new apiSuccess(
          200,
          "No conversations found",
          { totalUnreadCount: 0, conversations: [], hasMore: false },
          false
        )
      );
  }

  const userIds = new Set();
  conversations.forEach((conv) => {
    conv.participants.forEach((p) => {
      if (String(p) !== String(myId)) userIds.add(String(p));
    });
    if (conv.lastMessageSender) userIds.add(String(conv.lastMessageSender));
  });

  const Users = await user
    .find({ _id: { $in: Array.from(userIds) } })
    .select("name firstName lastName profilePicture isOnline lastSeen role")
    .lean();

  const usersMap = {};
  Users.forEach((u) => {
    usersMap[String(u._id)] = u;
  });

  let totalUnreadCount = 0;
  const result = conversations.map((conv) => {
    const otherUserId = conv.participants.find(
      (p) => String(p) !== String(myId)
    );
    const otherUser = usersMap[String(otherUserId)] || null;
    const sender = conv.lastMessageSender
      ? usersMap[String(conv.lastMessageSender)] || null
      : null;
    const unreadCount = conv.unreadCount?.[String(myId)] ?? 0;
    totalUnreadCount += unreadCount;
    const isSentByMe = String(conv.lastMessageSender) === String(myId);
    let preview = conv.lastMessageText?.trim() || "";
    if (preview && isSentByMe) preview = `You: ${preview}`;
    if (!preview && conv.lastMessageType) {
      preview =
        conv.lastMessageType === "image"
          ? "📷 Photo"
          : conv.lastMessageType === "video"
            ? "🎥 Video"
            : conv.lastMessageType === "voice"
              ? "🎤 Voice"
              : "Message";
    }
    return {
      conversationId: conv._id.toString(),
      title:
        conv.title ||
        (otherUser
          ? otherUser.name ||
            `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim() ||
            "User"
          : "Chat"),
      otherUser: otherUser
        ? {
            id: otherUser._id.toString(),
            name:
              otherUser.name ||
              `${otherUser.firstName || ""} ${otherUser.lastName || ""}`.trim(),
            profilePicture: otherUser.profilePicture,
            isOnline: !!otherUser.isOnline,
            lastSeen: otherUser.lastSeen,
            role: otherUser.role,
          }
        : null,
      unreadCount,
      hasUnread: unreadCount > 0,
      lastMessage: conv.lastMessageAt
        ? {
            id: conv.lastMessageId?.toString(),
            preview,
            type: conv.lastMessageType || "text",
            sentAt: conv.lastMessageAt,
            isSentByMe,
            sender: sender
              ? {
                  id: sender._id.toString(),
                  name: sender.name,
                  avatar: sender.profilePicture,
                }
              : null,
          }
        : null,
      property: conv.propertyId || null,
      lastMessageAt: conv.lastMessageAt,
      updatedAt: conv.lastMessageAt,
    };
  });

  const hasMore = conversations.length === limit;
  return res.status(200).json(
    new apiSuccess(200, "Conversations retrieved", {
      totalUnreadCount,
      conversations: result,
      pagination: { page, limit, hasMore },
    })
  );
});

const PAGE_SIZE = 30;

const getChatMessages = asyncHandler(async (req, res) => {
  const decoded = await decodeSessionToken(req);
  const loggedInUserId = decoded?.userData?.userId;
  const { chatUserId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(loggedInUserId) ||
    !mongoose.Types.ObjectId.isValid(chatUserId)
  ) {
    return res.status(400).json({
      status: 400,
      message: "Invalid user id",
      success: false,
      error: null,
    });
  }

  let cursor = null;
  if (req.query.cursor) {
    try {
      cursor = JSON.parse(req.query.cursor);
    } catch {
      return res.status(400).json({
        status: 400,
        message: "Invalid cursor format",
        success: false,
        error: null,
      });
    }
  }

  const conversationQuery = {
    $or: [
      { senderId: loggedInUserId, receiverId: chatUserId },
      { senderId: chatUserId, receiverId: loggedInUserId },
    ],
  };

  let paginationQuery = {};
  if (cursor?.createdAt && cursor?._id) {
    paginationQuery = {
      $or: [
        { createdAt: { $lt: new Date(cursor.createdAt) } },
        {
          createdAt: new Date(cursor.createdAt),
          _id: { $lt: new mongoose.Types.ObjectId(cursor._id) },
        },
      ],
    };
  }

  const messages = await Message.find({
    ...conversationQuery,
    ...paginationQuery,
  })
    .sort({ createdAt: -1, _id: -1 })
    .limit(PAGE_SIZE + 1)
    .populate("senderId", "firstName lastName profilePicture");

  let hasMore = false;
  let nextCursor = null;
  if (messages.length > PAGE_SIZE) {
    hasMore = true;
    const lastMessage = messages[PAGE_SIZE - 1];
    nextCursor = { createdAt: lastMessage.createdAt, _id: lastMessage._id };
    messages.length = PAGE_SIZE;
  }

  const chatUser = await user
    .findById(chatUserId)
    .select("firstName lastName profilePicture isOnline lastSeen role");
  if (!chatUser) {
    return res.status(404).json({
      status: 404,
      message: "Chat user not found",
      success: false,
      error: null,
    });
  }

  return res.status(200).json({
    status: 200,
    message: "Messages retrieved successfully",
    data: {
      chatUser: {
        id: chatUser._id,
        name: `${chatUser.firstName} ${chatUser.lastName}`,
        profilePicture: chatUser.profilePicture,
        isOnline: chatUser.isOnline,
        lastSeen: chatUser.lastSeen,
        role: chatUser.role,
      },
      messages,
      nextCursor,
      hasMore,
    },
    success: true,
    error: null,
  });
});

const markConversationSeen = asyncHandler(async (req, res, next) => {
  const decoded = await decodeSessionToken(req);
  const myId = decoded?.userData?.userId;
  const { otherUserId } = req.params;

  if (!myId) return next(new apiError(401, "Unauthorized", null, false));
  if (!otherUserId)
    return next(new apiError(400, "Other user ID is required", null, false));

  await Message.updateMany(
    { senderId: otherUserId, receiverId: myId, status: { $ne: "seen" } },
    { $set: { status: "seen", seenAt: new Date() } }
  );

  const key = buildParticipantsKey(myId, otherUserId);
  await Conversation.updateOne(
    { participantsKey: key },
    { $set: { [`unreadCount.${myId}`]: 0 } }
  );

  const io = getSocketInstance();
  const senderSocket = await getUserSocket(String(otherUserId));
  if (senderSocket) {
    io.to(senderSocket).emit("conversation-seen", { by: String(myId) });
  }

  return res
    .status(200)
    .json(new apiSuccess(200, "Conversation marked as seen", null, false));
});

module.exports = {
  sendChatMessage,
  getConversations,
  getChatMessages,
  markConversationSeen,
};
