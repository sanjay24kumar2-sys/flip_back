const express = require("express");
const fetch = require("node-fetch");
const multer = require("multer");
const { initializeApp } = require("firebase/app");
const { getStorage, ref, uploadBytes, getDownloadURL } = require("firebase/storage");

const router = express.Router();
const DB_URL = process.env.FIREBASE_DB_URL;

// Firebase configuration - ALL FROM ENV VARIABLES
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: DB_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
let storage;
try {
  const firebaseApp = initializeApp(firebaseConfig);
  storage = getStorage(firebaseApp);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  console.log('⚠️  Firebase Storage features will not work');
}

// Multer configuration - memory storage (files in memory only, NOT saved locally)
const upload = multer({
  storage: multer.memoryStorage(), // Files stay in memory, not saved to disk
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true);
  }
});

// Function to upload file to Firebase Storage
async function uploadToFirebaseStorage(file, productId) {
  try {
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.originalname.split('.').pop() || 'jpg';
    const fileName = `review_${productId}_${timestamp}_${randomString}.${fileExtension}`;
    
    // Create a reference to the storage location
    const storageRef = ref(storage, `reviews/${fileName}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file.buffer, {
      contentType: file.mimetype,
    });
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      url: downloadURL,
      fileName: fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
    throw error;
  }
}

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
    
    console.log('Received product data:', product);
    
    if (!product.id || !product.name) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and name are required'
      });
    }
    
    // Check if product already exists
    const checkResponse = await fetch(`${DB_URL}/products/${product.id}.json`);
    const existingProduct = await checkResponse.json();
    
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this ID already exists'
      });
    }
    
    const productId = product.id;
    
    product.status = product.status || 'active';
    product.created_at = new Date().toISOString();
    product.updated_at = new Date().toISOString();
    
    const firebaseResponse = await fetch(`${DB_URL}/products/${productId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(product)
    });

    if (!firebaseResponse.ok) {
      throw new Error(`Firebase error: ${firebaseResponse.status}`);
    }

    res.json({ 
      success: true,
      message: "Product added successfully",
      productId: productId
    });
    
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding product',
      error: error.message
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
    
    // Delete product from database
    await fetch(`${DB_URL}/products/${productId}.json`, {
      method: "DELETE"
    });
    
    // Delete related data
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

/* REVIEWS WITH IMAGE UPLOAD TO FIREBASE STORAGE */
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
    
    // Upload files to Firebase Storage
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      console.log(`Uploading ${req.files.length} files to Firebase Storage...`);
      
      for (const file of req.files) {
        try {
          const uploadedFile = await uploadToFirebaseStorage(file, productId);
          uploadedFiles.push(uploadedFile);
          console.log('File uploaded to Firebase:', uploadedFile);
        } catch (uploadError) {
          console.error('Error uploading file to Firebase:', uploadError);
          // Continue with other files even if one fails
        }
      }
    }
    
    const reviewId = `REV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reviewData = {
      id: reviewId,
      product_id: productId,
      customer_name: customer_name,
      rating: ratingNum,
      comment: reviewText,
      review_text: reviewText,
      images: uploadedFiles.map(file => file.url), // Firebase Storage URLs
      files: uploadedFiles,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    
    console.log('Saving review to Firebase Database:', reviewData);
    
    // Save to Firebase Database
    const firebaseResponse = await fetch(`${DB_URL}/reviews/${productId}/${reviewId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData)
    });

    if (!firebaseResponse.ok) {
      throw new Error(`Firebase Database error: ${firebaseResponse.status}`);
    }

    res.json({
      success: true,
      message: "Review added successfully",
      reviewId: reviewId,
      files: uploadedFiles
    });
    
    console.log('=== REVIEW UPLOAD SUCCESS ===');
    
  } catch (error) {
    console.error('Error adding review with files:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: `Server error while adding review: ${error.message}`,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/* SIMPLE REVIEWS WITHOUT IMAGES */
router.post("/reviews/:productId", async (req, res) => {
  try {
    const productId = req.params.productId;
    const { customer_name, rating, comment } = req.body;
    
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
    
    const reviewId = `REV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const reviewData = {
      id: reviewId,
      product_id: productId,
      customer_name: customer_name,
      rating: ratingNum,
      comment: comment || '',
      images: [],
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    
    // Save to Firebase Database
    const firebaseResponse = await fetch(`${DB_URL}/reviews/${productId}/${reviewId}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData)
    });

    if (!firebaseResponse.ok) {
      throw new Error(`Firebase Database error: ${firebaseResponse.status}`);
    }

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

router.delete("/reviews/:productId/:reviewId", async (req, res) => {
  try {
    const { productId, reviewId } = req.params;
    
    // Delete review from database
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

// Upload endpoint for single file to Firebase Storage
router.post("/upload", upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    const uploadedFile = await uploadToFirebaseStorage(req.file, 'general');
    
    res.json({
      success: true,
      url: uploadedFile.url,
      fileName: uploadedFile.fileName,
      originalName: uploadedFile.originalName,
      mimeType: uploadedFile.mimeType,
      size: uploadedFile.size
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading file'
    });
  }
});

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    env: {
      port: process.env.PORT,
      firebaseDB: process.env.FIREBASE_DB_URL ? 'Configured' : 'Not Configured',
      firebaseStorage: process.env.FIREBASE_STORAGE_BUCKET ? 'Configured' : 'Not Configured',
      firebaseAPIKey: process.env.FIREBASE_API_KEY ? 'Configured' : 'Not Configured'
    }
  });
});

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working!",
    time: new Date().toISOString()
  });
});

module.exports = router;