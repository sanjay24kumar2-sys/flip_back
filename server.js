require("dotenv").config();
require("dns").setDefaultResultOrder("verbatim");
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const os = require("os");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: "*", credentials: true, methods: ["GET","POST","PUT","DELETE","OPTIONS","PATCH"] }));
app.options("*", cors());

const limiter = rateLimit({ windowMs: 15*60*1000, max: 1000, message: "Too many requests" });
app.use(limiter);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/product-list.html")));
app.get("/products", (req, res) => res.sendFile(path.join(__dirname, "public/product-list.html")));
app.get("/add-product.html", (req, res) => res.sendFile(path.join(__dirname, "public/add-product.html")));
app.get("/health", (req, res) => res.json({ success: true, message: "Running" }));

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json({ success: false, message: "File too large" });
  if (err.code === "LIMIT_FILE_COUNT") return res.status(400).json({ success: false, message: "Max 5 files" });
  if (err.code === "ETIMEDOUT" || err.code === "ECONNRESET") return res.status(504).json({ success: false, message: "Network timeout" });
  res.status(500).json({ success: false, message: "Server error" });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

function getIP() {
  const interfaces = os.networkInterfaces();
  for (const iface in interfaces) {
    for (const config of interfaces[iface]) {
      if (config.family === 'IPv4' && !config.internal) return config.address;
    }
  }
  return '127.0.0.1';
}

app.listen(PORT, HOST, () => {
  const ip = getIP();
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Network: http://${ip}:${PORT}`);
  console.log(`Firebase: Connected`);
});