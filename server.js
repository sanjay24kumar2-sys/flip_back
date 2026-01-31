require("dotenv").config();
require("dns").setDefaultResultOrder("ipv4first");

const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const os = require("os");

const app = express();

// Security
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// API routes
const apiModule = require("./routes/api");
app.use("/api", apiModule.router); // <-- notice router export

// Pages
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/product-list.html"))
);
app.get("/flipkart", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

// Health
app.get("/health", (req, res) => {
  res.json({ success: true, status: "OK" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ success: false, message: "Server Error" });
});

// Get Local IP
function getIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "localhost";
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", async () => {
  console.log(` Local   : http://localhost:${PORT}`);
  console.log(` Network: http://${getIP()}:${PORT}`);

  if (typeof apiModule.warmUpCache === "function") {
    try {
      await apiModule.warmUpCache();
      console.log(" Cache warmup done");
    } catch (e) {
      console.warn("Warmup error ignored:", e.message);
    }
  }
});
