import express from 'express';
import { 
  createProduct, 
  getProducts, 
  getProductById,
  updateProduct,
  deleteProduct,
  getUserProducts,
  createProductWithFormData,
  handleProductMulterError
} from '../controllers/products/productController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Debug middleware to log request details
const logRequestDetails = (req, res, next) => {
  try {
    console.log('=== PRODUCT REQUEST DETAILS ===');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Content-Length:', req.headers['content-length']);
    console.log('Authorization:', req.headers['authorization'] ? 'Present' : 'Missing');
    
    // For large requests, don't log all headers to avoid console spam
    if (parseInt(req.headers['content-length'] || '0', 10) < 1000000) {
      console.log('Headers:', req.headers);
    } else {
      console.log('Request is large, limiting header log');
    }
    
    console.log('=========================');
  } catch (error) {
    console.error('Error in request logging middleware:', error);
  }
  next();
};

// Error handler for all routes
const errorHandler = (err, req, res, next) => {
  console.error('Route error handler caught:', err);
  
  // Handle network/request errors
  if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
    return res.status(408).json({
      success: false,
      message: 'Request timed out. The upload may be too large or the network connection is unstable.'
    });
  }
  
  if (err.code === 'ECONNRESET') {
    return res.status(499).json({
      success: false,
      message: 'Connection was reset. The client may have closed the connection during upload.'
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. Try reducing the number or size of files.'
    });
  }
  
  // Handle unexpected errors
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: err.message
  });
};

// Public routes
router.get('/', getProducts);
// Make sure user route comes BEFORE the :id route to avoid conflicts
router.get('/user/:userId', getUserProducts);
router.get('/:id', getProductById);

// New product creation route that uses express-form-data directly
// This is similar to how the post upload works
router.post('/upload', logRequestDetails, authenticate, createProductWithFormData);

// Legacy route with multer (deprecated)
router.post('/', 
  logRequestDetails, 
  authenticate, 
  (req, res, next) => {
    console.log('⚠️ Using deprecated product creation route. Please use /products/upload instead.');
    next();
  },
  createProductWithFormData
);

// Update product route
router.put('/:id', 
  logRequestDetails, 
  authenticate, 
  createProductWithFormData
);

// Delete product
router.delete('/:id', authenticate, deleteProduct);

// Error handler for all routes
router.use(errorHandler);

export default router; 