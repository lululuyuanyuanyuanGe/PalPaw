import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/palpaw';

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      // No need to explicitly set these options in newer Mongoose versions
      // They're set by default
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
};

// Test connection to MongoDB
const testMongoConnection = async () => {
  try {
    const status = mongoose.connection.readyState;
    if (status === 1) {
      console.log('MongoDB connection is active');
      return true;
    } else {
      console.log('MongoDB connection is not active, attempting to connect...');
      return await connectMongoDB();
    }
  } catch (error) {
    console.error('Error testing MongoDB connection:', error);
    return false;
  }
};

export { connectMongoDB, testMongoConnection }; 