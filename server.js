require("dotenv").config();

require("dns").setDefaultResultOrder("ipv4first");

const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use(express.static(path.join(__dirname, "public")));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  next();
});

const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/product-list.html"));
});

app.get("/products", (req, res) => {
  res.sendFile(path.join(__dirname, "public/product-list.html"));
});

app.get("/add-product.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public/add-product.html"));
});

app.use((err, req, res, next) => {
  console.error(" ERROR:", err.message);

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success:false, message:"File too large (10MB max)" });
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    return res.status(400).json({ success:false, message:"Max 5 files allowed" });
  }

  res.status(500).json({
    success:false,
    message:"Internal Server Error"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` Server running on http://localhost:${PORT}`);
  console.log(` Firebase DB: ${process.env.FIREBASE_DB_URL}`);
  console.log(` Firebase Storage: ${process.env.FIREBASE_STORAGE_BUCKET}`);
});
