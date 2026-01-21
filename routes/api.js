const express = require("express");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const DB_URL = process.env.FIREBASE_DB_URL;

// Configure multer for ALL image uploads - NO FILE TYPE RESTRICTIONS
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/reviews/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    // Keep original extension
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// ACCEPT ALL FILE TYPES - ADMIN CAN UPLOAD ANYTHING
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5 // Max 5 files
  },
  // REMOVED fileFilter - Accept all files
  fileFilter: function (req, file, cb) {
    // Accept all files
    cb(null, true);
  }
});

// Serve uploaded files
router.use('/uploads', express.static('uploads'));

/* PRODUCTS */
router.get("/products", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/products.json`);
    const data = await response.json();
    
    if (data) {
      const productsArray = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      }));
      
      const productsWithStatus = productsArray.map(product => ({
        ...product,
        status: product.status || 'active'
      }));
      
      return res.json({
        success: true,
        data: productsWithStatus,
        count: productsWithStatus.length
      });
    }
    
    res.json({
      success: true,
      data: [],
      count: 0
    });
    
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching products'
    });
  }
});

router.post("/products", async (req, res) => {
  try {
    const product = req.body;
    
    if (!product.id && !product.name) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and name are required'
      });
    }
    
    const productId = product.id || `PROD_${Date.now()}`;
    
    product.id = productId;
    product.status = product.status || 'active';
    product.created_at = new Date().toISOString();
    product.updated_at = new Date().toISOString();
    
    await fetch(`${DB_URL}/products/${productId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product)
    });

    res.json({ 
      success: true,
      message: "Product added successfully",
      productId: productId
    });
    
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding product'
    });
  }
});

router.put("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const productUpdates = req.body;
    
    const response = await fetch(`${DB_URL}/products/${productId}.json`);
    if (!response.ok) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const currentProduct = await response.json();
    
    const updatedProduct = {
      ...currentProduct,
      ...productUpdates,
      updated_at: new Date().toISOString()
    };
    
    await fetch(`${DB_URL}/products/${productId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedProduct)
    });

    res.json({ 
      success: true,
      message: "Product updated successfully",
      productId: productId
    });
    
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating product'
    });
  }
});

router.delete("/products/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    
    await fetch(`${DB_URL}/products/${productId}.json`, {
      method: "DELETE"
    });
    
    await fetch(`${DB_URL}/reviews/${productId}.json`, {
      method: "DELETE"
    });
    
    await fetch(`${DB_URL}/about_product/${productId}.json`, {
      method: "DELETE"
    });
    
    res.json({ 
      success: true,
      message: "Product deleted successfully"
    });
    
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting product'
    });
  }
});

/* REVIEWS WITH IMAGE UPLOAD - FIXED VERSION (ACCEPTS ALL FILE TYPES) */
router.post("/reviews-with-images/:productId", upload.array('images', 5), async (req, res) => {
  console.log('=== REVIEW UPLOAD STARTED ===');
  console.log('Files received:', req.files ? req.files.length : 0);
  console.log('Body:', req.body);
  
  try {
    const productId = req.params.productId;
    
    // Get data from FormData
    const { customer_name, rating, comment, review_text } = req.body;
    
    console.log('Parsed data:', { customer_name, rating, comment, review_text });
    
    // Use comment if review_text is not present
    const reviewText = review_text || comment || '';
    
    if (!customer_name || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and rating are required'
      });
    }
    
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a number between 1 and 5'
      });
    }
    
    // Process uploaded files - ANY FILE TYPE
    const fileUrls = [];
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} files`);
      req.files.forEach(file => {
        const fileUrl = `/uploads/reviews/${file.filename}`;
        console.log('File saved:', {
          filename: file.filename,
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          url: fileUrl
        });
        fileUrls.push(fileUrl);
      });
    }
    
    const reviewId = `REV_${Date.now()}`;
    const reviewData = {
      id: reviewId,
      product_id: productId,
      customer_name: customer_name,
      rating: ratingNum,
      comment: reviewText,
      review_text: reviewText,
      images: fileUrls, // Store all file URLs
      files: req.files ? req.files.map(file => ({
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size
      })) : [],
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    
    console.log('Saving review to Firebase:', reviewData);
    
    // Save to Firebase
    const firebaseResponse = await fetch(`${DB_URL}/reviews/${productId}/${reviewId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData)
    });

    if (!firebaseResponse.ok) {
      throw new Error(`Firebase error: ${firebaseResponse.status}`);
    }

    res.json({
      success: true,
      message: "Review added successfully",
      reviewId: reviewId,
      files: fileUrls
    });
    
    console.log('=== REVIEW UPLOAD SUCCESS ===');
    
  } catch (error) {
    console.error('Error adding review with files:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up uploaded files if there was an error
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const filePath = path.join('uploads/reviews', file.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (unlinkError) {
            console.error('Error cleaning up file:', unlinkError);
          }
        }
      });
    }
    
    res.status(500).json({
      success: false,
      message: `Server error while adding review: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

router.get("/reviews/:productId", async (req, res) => {
  const { productId } = req.params;
  
  try {
    const response = await fetch(`${DB_URL}/reviews/${productId}.json`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data) {
        const reviewsArray = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        
        return res.json({
          success: true,
          data: reviewsArray,
          count: reviewsArray.length
        });
      }
    }
    
    res.json({
      success: true,
      data: [],
      count: 0
    });
    
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching reviews'
    });
  }
});

// Old POST endpoint for backward compatibility
router.post("/reviews/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const review = req.body;
    
    if (!review.customer_name || !review.rating) {
      return res.status(400).json({
        success: false,
        message: 'Customer name and rating are required'
      });
    }
    
    if (review.rating < 1 || review.rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    if (review.images && !Array.isArray(review.images)) {
      review.images = [];
    }
    
    if (review.images && review.images.length > 5) {
      review.images = review.images.slice(0, 5);
    }
    
    const reviewId = `REV_${Date.now()}`;
    review.id = reviewId;
    review.product_id = productId;
    review.date = new Date().toISOString().split('T')[0];
    review.created_at = new Date().toISOString();
    
    await fetch(`${DB_URL}/reviews/${productId}/${reviewId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(review)
    });

    res.json({
      success: true,
      message: "Review added successfully",
      reviewId: reviewId
    });
    
  } catch (error) {
    console.error('Error adding review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding review'
    });
  }
});

router.delete("/reviews/:productId/:reviewId", async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    
    const reviewResponse = await fetch(`${DB_URL}/reviews/${productId}/${reviewId}.json`);
    if (reviewResponse.ok) {
      const review = await reviewResponse.json();
      
      if (review.images && Array.isArray(review.images)) {
        review.images.forEach(imageUrl => {
          if (imageUrl && imageUrl.startsWith('/uploads/reviews/')) {
            const filename = path.basename(imageUrl);
            const filePath = path.join('uploads/reviews', filename);
            
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (error) {
                console.error('Error deleting file:', error);
              }
            }
          }
        });
      }
    }
    
    await fetch(`${DB_URL}/reviews/${productId}/${reviewId}.json`, {
      method: "DELETE"
    });

    res.json({
      success: true,
      message: "Review deleted successfully"
    });
    
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review'
    });
  }
});

/* ABOUT PRODUCT */
router.get("/about-product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    
    const response = await fetch(`${DB_URL}/about_product/${productId}.json`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data) {
        const postsArray = Object.keys(data).map(key => ({
          ...data[key],
          id: key
        }));
        
        postsArray.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        return res.json({
          success: true,
          data: postsArray,
          count: postsArray.length
        });
      }
    }
    
    res.json({
      success: true,
      data: [],
      count: 0
    });
    
  } catch (error) {
    console.error('Error fetching about product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching about product'
    });
  }
});

router.post("/about-product", async (req, res) => {
  try {
    const { product_id, content } = req.body;
    
    if (!product_id || !content) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and content are required'
      });
    }
    
    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Content must be less than 2000 characters'
      });
    }
    
    const postId = `ABOUT_${Date.now()}`;
    const postData = {
      id: postId,
      product_id: product_id,
      content: content,
      created_at: new Date().toISOString(),
      author: "Admin"
    };
    
    await fetch(`${DB_URL}/about_product/${product_id}/${postId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postData)
    });

    res.json({
      success: true,
      message: "About Product content added successfully",
      postId: postId
    });
    
  } catch (error) {
    console.error('Error adding about product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding about product'
    });
  }
});

router.delete("/about-product/:productId/:postId", async (req, res) => {
  try {
    const { productId, postId } = req.params;
    
    await fetch(`${DB_URL}/about_product/${productId}/${postId}.json`, {
      method: "DELETE"
    });

    res.json({
      success: true,
      message: "About Product content deleted successfully"
    });
    
  } catch (error) {
    console.error('Error deleting about product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting about product'
    });
  }
});

/* UPI */
router.get("/upi", async (req, res) => {
  try {
    const response = await fetch(`${DB_URL}/upi/current.json`);
    
    if (response.ok) {
      const data = await response.json();
      
      if (data) {
        return res.json({
          success: true,
          upi_id: data.upi_id || null
        });
      }
    }
    
    res.json({
      success: true,
      upi_id: null
    });
    
  } catch (error) {
    console.error('Error fetching UPI:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching UPI'
    });
  }
});

router.post("/upi", async (req, res) => {
  try {
    const { upi_id } = req.body;
    
    if (!upi_id) {
      return res.status(400).json({ 
        success: false,
        message: "UPI ID is required" 
      });
    }

    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (!upiRegex.test(upi_id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid UPI ID format"
      });
    }

    await fetch(`${DB_URL}/upi/current.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        upi_id,
        updated_at: new Date().toISOString()
      })
    });

    res.json({ 
      success: true,
      message: "UPI ID saved successfully"
    });
    
  } catch (error) {
    console.error('Error saving UPI:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving UPI'
    });
  }
});

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
    console.error('Error deleting UPI:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting UPI'
    });
  }
});

/* SEARCH */
router.get("/search", async (req, res) => {
  try {
    const query = req.query.q?.toLowerCase() || "";
    
    if (!query) {
      return res.json({
        success: true,
        results: [],
        count: 0
      });
    }
    
    const response = await fetch(`${DB_URL}/products.json`);
    const products = await response.json();
    
    if (!products) {
      return res.json({
        success: true,
        results: [],
        count: 0
      });
    }
    
    const productsArray = Object.keys(products).map(key => ({
      ...products[key],
      id: key,
      status: products[key].status || 'active'
    }));
    
    const filtered = productsArray.filter(product =>
      (product.name?.toLowerCase().includes(query)) ||
      (product.description?.toLowerCase().includes(query)) ||
      (product.category?.toLowerCase().includes(query)) ||
      (product.id?.toLowerCase().includes(query))
    );
    
    res.json({
      success: true,
      results: filtered,
      count: filtered.length,
      query: query
    });
    
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching'
    });
  }
});

// Upload endpoint for single file
router.post("/upload", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const fileUrl = `/uploads/reviews/${req.file.filename}`;
    
    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading file'
    });
  }
});

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString()
  });
});

module.exports = router;