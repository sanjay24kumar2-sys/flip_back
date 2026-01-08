const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const router = express.Router();
const DB_URL = process.env.FIREBASE_DB_URL;

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
  try {
    const r = await fetch(`${DB_URL}/upi.json`);
    const data = await r.json();
    
    if (!data) {
      return res.json({ 
        success: true, 
        upi_id: null 
      });
    }
    
    const upiKey = Object.keys(data)[0];
    const upiData = data[upiKey];
    
    res.json({
      success: true,
      upi_id: upiData?.upi_id || null
    });
  } catch (error) {
    console.error("Error fetching UPI:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to fetch UPI ID" 
    });
  }
});

// Create or Update UPI ID
router.post("/upi", async (req, res) => {
  try {
    const { upi_id } = req.body;
    
    if (!upi_id) {
      return res.status(400).json({ 
        success: false, 
        error: "UPI ID is required" 
      });
    }
    
    const upiData = {
      upi_id: upi_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Use a fixed key "current" for UPI ID
    await fetch(`${DB_URL}/upi/current.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upiData)
    });
    
    res.json({ 
      success: true, 
      message: "UPI ID saved successfully",
      upi_id: upi_id
    });
  } catch (error) {
    console.error("Error saving UPI:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to save UPI ID" 
    });
  }
});

// Delete UPI ID
router.delete("/upi", async (req, res) => {
  try {
    await fetch(`${DB_URL}/upi/current.json`, {
      method: "DELETE"
    });
    
    res.json({ 
      success: true, 
      message: "UPI ID removed successfully" 
    });
  } catch (error) {
    console.error("Error deleting UPI:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to remove UPI ID" 
    });
  }
});

module.exports = router;
