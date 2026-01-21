require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Debug middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST' && req.url.includes('/api/')) {
    console.log('Request body:', req.body);
  }
  next();
});

// API Routes
const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

// HTML Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/product-list.html"));
});

app.get("/products", (req, res) => {
  res.sendFile(path.join(__dirname, "public/product-list.html"));
});

app.get("/add-product.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/add-product.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("🚨 Error Middleware:", err);
  console.error("🚨 Error Stack:", err.stack);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB'
    });
  }
  
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum 5 files allowed'
    });
  }
  
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Access at: http://localhost:${PORT}`);
  console.log(`🔥 Firebase DB: ${process.env.FIREBASE_DB_URL}`);
  console.log(`🔥 Firebase Storage: ${process.env.FIREBASE_STORAGE_BUCKET}`);
});