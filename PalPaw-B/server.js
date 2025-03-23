import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import path from 'path';
import formData from 'express-form-data';
import os from 'os';

import { testConnection } from './config/postgres.js'; // PostgreSQL connection
import { syncModels } from './models/index.js'; // Sequelize models

// Import routes
import pgAuthRoutes from './routes/pgAuth.js'; // PostgreSQL auth routes
import postRoutes from './routes/posts.js'; // Post routes
import uploadRoutes from './routes/upload.js'; // Upload routes

// Load environment variables
dotenv.config();

const app = express();

// Connect to PostgreSQL and synchronize models
testConnection();
syncModels(); // Set to true to force recreate tables: syncModels(true)

// Middleware
app.use(cors());

// Add raw body logging middleware before body parser
app.use((req, res, next) => {
  console.log('== REQUEST INFO ==');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Content-Type:', req.headers['content-type']);
  next();
});

// Options for express-form-data
const formDataOptions = {
  uploadDir: os.tmpdir(),
  autoClean: true
};

// Parse multipart/form-data
app.use(formData.parse(formDataOptions));
// Delete files from the upload directory
app.use(formData.format());
// Change file objects to node stream.Readable
app.use(formData.stream());
// Union body and files
app.use(formData.union());

app.use(bodyParser.json());

// Another middleware after body-parser to see what's available
app.use((req, res, next) => {
  if (req.method === 'POST') {
    console.log('== PARSED BODY ==');
    console.log('Body after parsing:', req.body);
  }
  next();
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use("/api/pg/auth", pgAuthRoutes); // PostgreSQL auth
app.use("/api/posts", postRoutes); // Post routes
app.use("/api/upload", uploadRoutes); // Upload routes

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PalPaw API' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));