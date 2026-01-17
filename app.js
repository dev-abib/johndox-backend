const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const http = require("http");
const { initSocket } = require("./src/Utils/socket.js"); // Import initSocket

const allRoutes = require("./src/Routes/index.js");
const { user } = require("./src/Schema/user.schema.js");
const { Message } = require("./src/Schema/message.schema.js");

const app = express();
const PORT = process.env.PORT || 8000;

app.set("trust proxy", 1);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(helmet());

// Update CORS configuration to specify the allowed origin
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://johndox-admin-dashboard.vercel.app",
      "http://localhost:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again later.",
});
app.use(limiter);

// Static files
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

// Create HTTP server for socket.io
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port: http://localhost:${PORT}`);
});
