const express = require("express");
const fetch = require("node-fetch");
const multer = require("multer");
const sharp = require("sharp");
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL } = require("firebase/storage");

const router = express.Router();
const DB_URL = process.env.FIREBASE_DB_URL;

const cache = new Map();
const CACHE_TTL_PRODUCTS = 5 * 60 * 1000;
const CACHE_TTL_SEARCH = 2 * 60 * 1000; 
const CACHE_TTL_UPI = 60 * 1000; 

function getCache(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data, ttl) {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

async function fetchWithTimeout(url, options = {}, timeout = 15000, retry = 2) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return res;
  } catch (err) {
    clearTimeout(id);
    if (retry > 0) return fetchWithTimeout(url, options, timeout, retry - 1);
    throw err;
  }
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: DB_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const storage = getStorage(firebaseApp);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }
});

async function compressImage(fileBuffer) {
  return sharp(fileBuffer)
    .resize(1024, 1024, { fit: "inside" })
    .jpeg({ quality: 80 })
    .toBuffer();
}

async function uploadToFirebaseStorage(file, productId) {
  const compressedBuffer = await compressImage(file.buffer);

  const name = `review_${productId}_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2)}.${file.originalname.split(".").pop()}`;

  const storageRef = ref(storage, `reviews/${name}`);
  const snap = await uploadBytes(storageRef, compressedBuffer, {
    contentType: file.mimetype
  });

  const url = await getDownloadURL(snap.ref);
  return { url, fileName: name, size: compressedBuffer.length };
}

async function warmUpCache() {
  try {
    const r = await fetch(`${DB_URL}/products.json`);
    const d = await r.json();
    const allProducts = d ? Object.keys(d).map(id => ({ id, ...d[id] })) : [];
    setCache("products:page1:limit20", {
      success: true,
      data: allProducts.slice(0, 20),
      total: allProducts.length
    }, CACHE_TTL_PRODUCTS);
    console.log(" Cache warmup done");
  } catch (e) {
    console.error(" Cache warmup failed:", e.message);
  }
}

router.get("/products", async (req, res) => {
  const page = parseInt(req.query.page || "1");
  const limit = parseInt(req.query.limit || "20");
  const cacheKey = `products:page${page}:limit${limit}`;

  let cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    const r = await fetchWithTimeout(`${DB_URL}/products.json`, {}, 15000, 3);
    const d = await r.json();
    const allProducts = d ? Object.keys(d).map(id => ({ id, ...d[id] })) : [];
    const start = (page - 1) * limit;
    const paginated = allProducts.slice(start, start + limit);

    const result = { success: true, data: paginated, total: allProducts.length };
    setCache(cacheKey, result, CACHE_TTL_PRODUCTS);

    // also warmup first page cache if this is page 1
    if (page === 1) setCache("products:page1:limit20", result, CACHE_TTL_PRODUCTS);

    res.json(result);
  } catch (e) {
    console.error("Product fetch failed:", e.message);

    // fallback: if cache exists, send stale data
    cached = getCache("products:page1:limit20");
    if (cached) return res.json({ ...cached, warning: "Using stale cache" });

    res.status(500).json({ success: false, message: "Products loading failed, try again" });
  }
});

router.post("/products", async (req, res) => {
  const p = req.body;
  if (!p.id || !p.name)
    return res.status(400).json({ success: false });

  await fetchWithTimeout(`${DB_URL}/products/${p.id}.json`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...p, created_at: new Date().toISOString() })
  });

  cache.clear(); // clear all cache
  warmUpCache(); // refresh first page
  res.json({ success: true });
});

router.get("/search", async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  if (!q) return res.json({ success: true, results: [] });

  const cacheKey = `search:${q}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  const r = await fetchWithTimeout(`${DB_URL}/products.json`);
  const d = await r.json();
  const filtered = d
    ? Object.keys(d)
        .map(id => ({ id, ...d[id] }))
        .filter(p => p.name?.toLowerCase().includes(q))
    : [];

  const result = { success: true, results: filtered };
  setCache(cacheKey, result, CACHE_TTL_SEARCH);
  res.json(result);
});

router.post(
  "/reviews-with-images/:productId",
  upload.array("images", 5),
  async (req, res) => {
    const { productId } = req.params;
    const { customer_name, rating, comment } = req.body;

    if (!customer_name || !rating)
      return res.status(400).json({ success: false });

    const uploads = (req.files || []).map(file =>
      uploadToFirebaseStorage(file, productId)
    );

    const uploaded = await Promise.allSettled(uploads);
    const files = uploaded
      .filter(r => r.status === "fulfilled")
      .map(r => r.value);

    const reviewId = `REV_${Date.now()}`;
    await fetchWithTimeout(`${DB_URL}/reviews/${productId}/${reviewId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_name,
        rating: Number(rating),
        comment,
        images: files.map(f => f.url),
        created_at: new Date().toISOString()
      })
    });

    res.json({ success: true, files });
  }
);

router.get("/upi", async (req, res) => {
  const cached = getCache("upi");
  if (cached) return res.json(cached);

  const r = await fetchWithTimeout(`${DB_URL}/upi/current.json`);
  const d = await r.json();

  const result = { success: true, upi_id: d?.upi_id || null };
  setCache("upi", result, CACHE_TTL_UPI);
  res.json(result);
});

router.get("/test", (req, res) => {
  res.json({ success: true, fast: true });
});

setInterval(async () => {
  try {
    const r = await fetch(`${DB_URL}/products.json`);
    const d = await r.json();
    const allProducts = d ? Object.keys(d).map(id => ({ id, ...d[id] })) : [];
    setCache("products:page1:limit20", {
      success: true,
      data: allProducts.slice(0, 20),
      total: allProducts.length
    }, CACHE_TTL_PRODUCTS);
    console.log(" Background cache refreshed");
  } catch (e) {
    console.error(" Background cache refresh failed:", e.message);
  }
}, 5 * 60 * 1000);

module.exports = { router, warmUpCache };
