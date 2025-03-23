import { DataTypes } from 'sequelize';
import { sequelize } from '../config/postgres.js';

// Define Product model
const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Foreign key to User (seller)
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  // Product name
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  // Product description
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  // Product price
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  // Product category
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Product condition (New, Like New, Good, Fair)
  condition: {
    type: DataTypes.ENUM('New', 'Like New', 'Good', 'Fair'),
    defaultValue: 'New'
  },
  // Array of media URLs (images, videos)
  media: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of media objects with url and type'
  },
  // Product quantity available
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 0
    }
  },
  // Product status
  status: {
    type: DataTypes.ENUM('active', 'sold', 'unavailable'),
    defaultValue: 'active'
  },
  // Optional product tags
  tags: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: []
  },
  // Shipping information (JSON object)
  shipping: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  // View count
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  // Soft delete flag
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true, // Automatically add createdAt and updatedAt
  indexes: [
    {
      fields: ['userId'],
      name: 'product_user_id_index'
    },
    {
      fields: ['category'],
      name: 'product_category_index'
    },
    {
      fields: ['status'],
      name: 'product_status_index'
    },
    {
      fields: ['price'],
      name: 'product_price_index'
    },
    {
      fields: ['tags'],
      name: 'product_tags_index',
      using: 'gin' // GIN index for array search
    }
  ]
});

export default Product; 