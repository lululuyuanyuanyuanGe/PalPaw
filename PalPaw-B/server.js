import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';


import { testConnection } from './config/postgres.js'; // PostgreSQL connection
import { syncModels } from './models/index.js'; // Sequelize models

// Import routes
import pgAuthRoutes from './routes/pgAuth.js'; // PostgreSQL auth routes

// Load environment variables
dotenv.config();

const app = express();

// Connect to PostgreSQL and synchronize models
testConnection();
syncModels(); // Set to true to force recreate tables: syncModels(true)

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
app.use("/api/pg/auth", pgAuthRoutes); // PostgreSQL auth

// Home route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PalPaw API' });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));