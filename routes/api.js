const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const router = express.Router();
const DB_URL = process.env.FIREBASE_DB_URL;

/* PRODUCTS */
router.get("/products", async (req, res) => {
  const r = await fetch(`${DB_URL}/products.json`);
  const data = await r.json();
  res.json(data || {});
});

router.post("/products", async (req, res) => {
  const product = req.body;

  await fetch(`${DB_URL}/products/${product.id}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product)
  });

  res.json({ success: true });
});

router.delete("/products/:id", async (req, res) => {
  await fetch(`${DB_URL}/products/${req.params.id}.json`, {
    method: "DELETE"
  });
  res.json({ success: true });
});

router.get("/upi", async (req, res) => {
  const r = await fetch(`${DB_URL}/upi/current.json`);
  const data = await r.json();

  res.json({
    success: true,
    upi_id: data?.upi_id || null
  });
});

router.post("/upi", async (req, res) => {
  const { upi_id } = req.body;
  if (!upi_id) return res.status(400).json({ error: "UPI required" });

  await fetch(`${DB_URL}/upi/current.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ upi_id })
  });

  res.json({ success: true });
});

router.delete("/upi", async (req, res) => {
  await fetch(`${DB_URL}/upi/current.json`, { method: "DELETE" });
  res.json({ success: true });
});

module.exports = router;
