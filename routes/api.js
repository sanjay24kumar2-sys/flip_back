const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const router = express.Router();
const DB_URL = process.env.FIREBASE_DB_URL;

router.get("/upi", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/upi.json`);
    const data = await response.json();
    
    let upiData = null;
    if (data) {
      const keys = Object.keys(data);
      if (keys.length > 0) {
        upiData = data[keys[0]];
      }
    }
    
    res.json(upiData || {});
  } catch (error) {
    console.error("Error fetching UPI:", error);
    res.status(500).json({ error: "Failed to fetch UPI data" });
  }
});

router.post("/upi", async (req, res) => {
  try {
    const upiData = req.body;
    if (!upiData.upi_id) {
      return res.status(400).json({ error: "UPI ID is required" });
    }
    
    const existingResponse = await fetch(`${DB_URL}/upi.json`);
    const existingData = await existingResponse.json();
    
    if (existingData) {
      const existingKeys = Object.keys(existingData);
      for (const key of existingKeys) {
        await fetch(`${DB_URL}/upi/${key}.json`, {
          method: "DELETE"
        });
      }
    }
    
    const upiId = `upi_${Date.now()}`;
    
    if (!upiData.created_at) {
      upiData.created_at = new Date().toISOString();
    }
    upiData.updated_at = new Date().toISOString();
    
    await fetch(`${DB_URL}/upi/${upiId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(upiData)
    });
    
    res.json({ success: true, message: "UPI ID saved successfully", data: upiData });
  } catch (error) {
    console.error("Error saving UPI:", error);
    res.status(500).json({ error: "Failed to save UPI data" });
  }
});

router.delete("/upi", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/upi.json`);
    const data = await response.json();
    
    if (data) {
      const keys = Object.keys(data);
      for (const key of keys) {
        await fetch(`${DB_URL}/upi/${key}.json`, {
          method: "DELETE"
        });
      }
    }
    
    res.json({ success: true, message: "UPI ID deleted successfully" });
  } catch (error) {
    console.error("Error deleting UPI:", error);
    res.status(500).json({ error: "Failed to delete UPI data" });
  }
});
router.get("/products", async (req, res) => {
  try {
    const r = await fetch(`${DB_URL}/products.json`);
    const data = await r.json();
    
    if (!data) {
      return res.json({ success: true, data: [] });
    }
    
    // Convert Firebase object to array
    const productsArray = Object.keys(data).map(key => ({
      id: key,
      ...data[key]
    }));
    
    res.json({ success: true, data: productsArray });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.post("/products", async (req, res) => {
  try {
    const product = req.body;
    
    if (!product.id) {
      product.id = `product_${Date.now()}`;
    }
    
    product.created_at = new Date().toISOString();
    product.updated_at = new Date().toISOString();
    
    await fetch(`${DB_URL}/products/${product.id}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product)
    });
    
    res.json({ success: true, message: "Product added successfully", productId: product.id });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ error: "Failed to add product" });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const product = req.body;
    
    product.updated_at = new Date().toISOString();
    
    await fetch(`${DB_URL}/products/${productId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product)
    });
    
    res.json({ success: true, message: "Product updated successfully" });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    await fetch(`${DB_URL}/products/${req.params.id}.json`, {
      method: "DELETE"
    });
    
    res.json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

module.exports = router;
