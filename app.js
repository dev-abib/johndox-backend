const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bodyParser = require("body-parser");
const http = require("http");

const { initSocket } = require("./src/Utils/socket.js");
const allRoutes = require("./src/Routes/index.js");
const { stripeWebhook } = require("./src/Controller/billing.controller.js");

const app = express();
const PORT = process.env.PORT || 8000;

app.set("trust proxy", 1);

app.post(`/webhook`, express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

app.use(helmet());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://johndox-admin-dashboard.vercel.app",
      "http://localhost:3000",
      "https://johndox-frontend.vercel.app",
      "http://103.161.9.205:5173",
      "https://johndox.vercel.app",
      "http://localhost:3001",
      "http://103.161.9.205:3000",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  })
);

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many requests from this IP, please try again later.",
// });
// app.use(limiter);

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
initSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port: http://localhost:${PORT}`);
});
//
