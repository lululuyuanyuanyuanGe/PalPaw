import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';

import { testConnection } from './config/postgres.js'; // PostgreSQL connection
import { syncModels } from './models/index.js'; // Sequelize models

// Import routes
import pgAuthRoutes from './routes/pgAuth.js'; // PostgreSQL auth routes
import uploadRoutes from './routes/upload.js'; // Upload routes
import userRoutes from './routes/users.js'; // User routes
import likesRoutes from './routes/likes.js'; // Likes routes
import postsRoutes from './routes/posts.js'; // Posts routes
import productsRoutes from './routes/products.js'; // Products routes

// Load environment variables
dotenv.config();

const app = express();

// Connect to PostgreSQL and synchronize models
(async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync models
    await syncModels(true);
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
  }
})();

// Middleware
app.use(cors());

// Add request logging middleware
app.use((req, res, next) => {
  console.log('== REQUEST INFO ==');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  next();
});

// Increase size limits for larger uploads
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));

// Logging middleware to see body after parsing
app.use((req, res, next) => {
  if (req.method === 'POST' && !req.url.startsWith('/api/upload/')) {
    console.log('== PARSED BODY ==');
    console.log('Body after parsing:', req.body);
  }
  next();
});

// Serve static files from uploads directory
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log('Serving uploads from:', uploadsPath);
app.use('/uploads', express.static(uploadsPath));

// Routes
console.log('Registered routes:');
app.use("/api/pg/auth", pgAuthRoutes); // PostgreSQL auth
console.log('- /api/pg/auth');
app.use("/api/upload", uploadRoutes); // Upload routes
console.log('- /api/upload');
app.use("/api/pg/users", userRoutes); // User routes
console.log('- /api/pg/users');
app.use("/api/likes", likesRoutes); // Likes routes
console.log('- /api/likes');
app.use("/api/pg/posts", postsRoutes); // Posts routes
console.log('- /api/pg/posts');
app.use("/api/pg/products", productsRoutes); // Products routes
console.log('- /api/pg/products');

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PalPaw API' });
});

// Add error handler middleware at the end of your middleware chain
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  if (req.path.startsWith('/uploads/')) {
    console.error(`Error serving media file: ${req.path}`, err);
    return res.status(500).send('Error serving media file');
  }
  
  res.status(500).send('Server error');
});

// Set port from environment variable or default
const PORT = process.env.PORT || 5001;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});