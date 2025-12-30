const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

let io; 
let userSocketMap = {}; 



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

    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        console.log("JWT expired or invalid");
        socket.emit("error", "Token expired or invalid");
        socket.disconnect();
      }
      const userId = decoded.userData.userId;
      if (userId) {
        userSocketMap[userId] = socket.id;
      }

      io.emit("get-online-users", Object.keys(userSocketMap));

      socket.on("disconnect", () => {
        console.log("User disconnected:", userId);
        delete userSocketMap[userId];
        io.emit("get-online-users", Object.keys(userSocketMap));
      });
    });
  });
};


const getSocketInstance = () => io;

const getUserSocketMap = () => userSocketMap;

module.exports = { initSocket, getSocketInstance, getUserSocketMap };
