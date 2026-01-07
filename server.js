require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));


app.use(express.static(path.join(__dirname, "public")));

const apiRoutes = require("./routes/api");
app.use("/api", apiRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/add-product.html"));
});

app.get("/products", (req, res) => {
  res.sendFile(path.join(__dirname, "public/product-list.html"));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(` Server running → http://localhost:${PORT}`)
);