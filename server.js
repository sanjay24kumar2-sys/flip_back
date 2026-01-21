require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

const app = express();

// Create upload directories
const uploadDirs = ['uploads', 'uploads/reviews'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static('uploads'));

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
  console.error(err.stack);
  
  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 10MB'
    });
  }
  
  // Multer file count error
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
  console.log(`Server running on port ${PORT}`);
  console.log(`Upload directory: ${path.join(__dirname, 'uploads/reviews')}`);
});