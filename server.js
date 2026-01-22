require("dotenv").config();
require("dns").setDefaultResultOrder("ipv4first");
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const os = require("os");

const app = express();

app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
  allowedHeaders: ["*"],
  exposedHeaders: ["Content-Range", "X-Content-Range"]
}));

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH,HEAD");
  res.header("Access-Control-Allow-Headers", "*");
  res.sendStatus(200);
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  res.header("X-Powered-By", "Express");
  res.header("X-Forwarded-Proto", req.protocol);
  next();
});

const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/product-list.html")));
app.get("/products", (req, res) => res.sendFile(path.join(__dirname, "public/product-list.html")));
app.get("/add-product.html", (req, res) => res.sendFile(path.join(__dirname, "public/add-product.html")));

app.get("/health", (req, res) => res.json({ 
  success: true, 
  message: "Server Running",
  ip: req.ip,
  network: "Active"
}));

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ success: false, message: "File too large" });
  if (err.code === "LIMIT_FILE_COUNT") return res.status(400).json({ success: false, message: "Max 5 files" });
  res.status(500).json({ success: false, message: "Server error" });
});

function getIP() {
  const interfaces = os.networkInterfaces();
  for (const iface in interfaces) {
    for (const config of interfaces[iface]) {
      if (config.family === 'IPv4' && !config.internal) return config.address;
    }
  }
  return '127.0.0.1';
}

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const server = app.listen(PORT, HOST, () => {
  const ip = getIP();
  console.log(` Server: http://localhost:${PORT}`);
  console.log(` Network: http://${ip}:${PORT}`);
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.setTimeout(30000);

process.on("uncaughtException", () => {});
process.on("unhandledRejection", () => {});