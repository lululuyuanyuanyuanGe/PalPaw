import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

// Create a Sequelize instance with PostgreSQL connection details
const sequelize = new Sequelize(
  process.env.POSTGRES_DB || 'palpaw',
  process.env.POSTGRES_USER || 'postgres',
  process.env.POSTGRES_PASSWORD || 'postgres',
  {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the PostgreSQL database:', error);
  }
};

export { sequelize, testConnection }; 