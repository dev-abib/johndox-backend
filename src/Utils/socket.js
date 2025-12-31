const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const redis = require("../Utils/redis");
const { Message } = require("../Schema/message.schema");

let io;
let userSocketMap = {}; 

// Initialize Socket.IO server
const initSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.query?.token;
    const secretKey = process.env.SECRET_KEY;

    // Verify JWT Token
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        console.log("JWT expired or invalid");
        socket.emit("error", "Token expired or invalid");
        socket.disconnect();
      }

      const userId = decoded?.userData.userId;
      if (userId) {
        userSocketMap[userId] = socket.id;
        redis.subscribe(`user:${userId}:messages`, (err, count) => {
          if (err) {
            console.log("Error subscribing to Redis channel", err);
          } else {
            console.log(`Subscribed to ${count} Redis channels`);
          }
        });
      }

      io.emit("get-online-users", Object.keys(userSocketMap)); 
      redis.on("message", (channel, message) => {
        if (channel === `user:${userId}:messages`) {
          socket.emit("receive-message", JSON.parse(message));
        }
      });

      // Typing event handler
      socket.on("typing", (data) => {
        if (userSocketMap[data.receiverId]) {
          io.to(userSocketMap[data.receiverId]).emit("typing", {
            senderId: data.senderId,
            receiverId: data.receiverId,
          });
        }
      });

      // Handle delivered message event
      socket.on("message-delivered", async (messageId) => {
        try {
          const message = await Message.findById(messageId);
          if (message) {
            const senderSocketId = userSocketMap[message.sender];
            if (senderSocketId) {
              await Message.findByIdAndUpdate(messageId, {
                status: "delivered",
              });
              io.to(senderSocketId).emit("message-delivered", messageId); 
            }
          }
        } catch (error) {
          console.error("Error updating delivered status:", error);
        }
      });

      // Handle read message event
      socket.on("message-read", async (messageId) => {
        try {
          const message = await Message.findById(messageId);
          if (message) {
            const senderSocketId = userSocketMap[message.sender];
            if (senderSocketId) {
              await Message.findByIdAndUpdate(messageId, { isRead: true });
              io.to(senderSocketId).emit("message-read", messageId); 
            }
          }
        } catch (error) {
          console.error("Error updating read status:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log("User disconnected:", userId);
        delete userSocketMap[userId];
        io.emit("get-online-users", Object.keys(userSocketMap));
        redis.unsubscribe(`user:${userId}:messages`); 
      });
    });
  });
};

module.exports = {
  initSocket,
  getSocketInstance: () => io,
  getUserSocketMap: () => userSocketMap,
};
