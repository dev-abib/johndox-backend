const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const http = require("http");
const socketIo = require("socket.io");
const redisAdapter = require("socket.io-redis");

const allRoutes = require("./src/Routes/index");
const { user } = require("./src/Schema/user.schema");
const app = express();
const PORT = process.env.PORT || 8000;
const initSocket = require("./socket.js");

// Middleware setup
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(helmet());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://itsjacks-dashboard.vercel.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

app.use("/public", express.static("public"));

app.use(allRoutes);

app.use((err, req, res, next) => {
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    statusCode,
    success: typeof err.success === "boolean" ? err.success : false,
    message: err.message || "Internal Server Error",
    data: err.data || null,
  });
});

const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.adapter(
  redisAdapter({
    host: "127.0.0.1",
    port: 6379,
  })
);

initSocket(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Listening on port: http://localhost:${PORT}`);
});
