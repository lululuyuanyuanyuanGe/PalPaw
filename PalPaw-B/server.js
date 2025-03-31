import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import http from 'http';
import mongoose from 'mongoose';

import { testConnection } from './config/postgres.js'; // PostgreSQL connection
import { connectMongoDB } from './config/mongoDB.js'; // MongoDB connection
import { syncModels } from './models/index.js'; // Sequelize models

// Import routes
import pgAuthRoutes from './routes/pgAuth.js'; // PostgreSQL auth routes
import uploadRoutes from './routes/upload.js'; // Upload routes
import likesRoutes from './routes/likes.js'; // Likes routes
import postsRoutes from './routes/posts.js'; // Posts routes
import productsRoutes from './routes/products.js'; // Products
import commentRoutes from './routes/commentRoutes.js'; // Comments routes
import userRoutes from './routes/user.js'; // User routes
import setupSocketServer from './socketServer.js';
import chatRoutes from './routes/chat.js';
import userMongoRoutes from './routes/userMongoRoute.js'; // MongoDB user routes

// Load environment variables
dotenv.config();

const app = express();

// Connect to PostgreSQL and synchronize models
(async () => {
  try {
    // Test database connection
    await testConnection();
    
    // Sync models
    await syncModels();
    
    console.log('PostgreSQL database setup completed successfully');

    // Connect to MongoDB for chat functionality
    await connectMongoDB();

    // After MongoDB connection is established
    mongoose.connection.on('connected', async () => {
      console.log('Connected to MongoDB database');
      
      // Check if we're in development mode
      if (process.env.NODE_ENV !== 'production') {
        try {
          console.log('Development mode detected - checking database setup');
          
          // Check if chats collection exists and has documents
          const collections = await mongoose.connection.db.listCollections({ name: 'chats' }).toArray();
          
          if (collections.length > 0) {
            console.log('Dropping chats collection to rebuild with new schema...');
            try {
              // Drop the chats collection to ensure fresh schema
              await mongoose.connection.db.dropCollection('chats');
              console.log('Successfully dropped chats collection');
            } catch (err) {
              console.log('No chats collection to drop or error dropping:', err.message);
            }
          } else {
            console.log('No chats collection found, will be created fresh');
          }
          
          console.log('Database reset for development complete');
        } catch (error) {
          console.error('Error during development database setup:', error);
        }
      }
    });
  } catch (error) {
    console.error('Database setup failed:', error);
  }
})();

// Initialize WebSocket server
const server = http.createServer(app);

// Set up Socket.io server
const io = setupSocketServer(server);

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

// Serve static files from messages directory for chat media
const messagesPath = path.join(process.cwd(), 'messages');
console.log('Serving chat media from:', messagesPath);
app.use('/messages', express.static(messagesPath));

// Routes
console.log('Registered routes:');


app.use("/api/pg/auth", pgAuthRoutes); // PostgreSQL auth
console.log('- /api/pg/auth');

app.use("/api/upload", uploadRoutes); // Upload routes
console.log('- /api/upload');

app.use("/api/likes", likesRoutes); // Likes routes
console.log('- /api/likes');

app.use("/api/pg/posts", postsRoutes); // Posts routes
console.log('- /api/pg/posts');

app.use("/api/pg/products", productsRoutes); // Products routes
console.log('- /api/pg/products');

app.use("/api/comments", commentRoutes); // Comments routes
console.log('- /api/comments');

app.use("/api/users", userRoutes); // User routes
console.log('- /api/users');

app.use('/api/chats', chatRoutes);
console.log('- /api/chats');

app.use('/api/mongo/users', userMongoRoutes); // MongoDB user routes
console.log('- /api/mongo/users');

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

// Start server using the HTTP server instead of Express app
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});