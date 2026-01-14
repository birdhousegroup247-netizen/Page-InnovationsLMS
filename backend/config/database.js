const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
// Support both DATABASE_URL (Render/Heroku) and individual env vars
let sequelize;

if (process.env.DATABASE_URL) {
  // Production: Use DATABASE_URL from Render/Heroku
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10, // Increased from 5 to 10 for better concurrency
      min: parseInt(process.env.DB_POOL_MIN) || 2, // Keep 2 warm connections
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000, // 60s timeout for acquiring connection
      idle: parseInt(process.env.DB_POOL_IDLE) || 30000, // Increased to 30s to reduce reconnects
      evict: 60000, // Check for idle connections every 60s
    },

    retry: {
      max: 5,
      timeout: 60000
    },

    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true,
    },

    timezone: '+00:00',
    dialectOptions: process.env.DB_DISABLE_SSL === 'true' ? {} : {
      ssl: {
        require: true,
        rejectUnauthorized: false // Required for Render/Heroku with self-signed certs
      },
      connectTimeout: 60000 // 60 second timeout
    }
  });
} else {
  // Development: Use individual environment variables
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: process.env.DB_DIALECT || 'mysql',
      logging: process.env.NODE_ENV === 'development' ? console.log : false,

      pool: {
        max: parseInt(process.env.DB_POOL_MAX) || 10, // Increased from 5 to 10
        min: parseInt(process.env.DB_POOL_MIN) || 2, // Keep 2 warm connections
        acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
        idle: parseInt(process.env.DB_POOL_IDLE) || 30000, // Increased to 30s
        evict: 60000, // Check for idle connections every 60s
      },

      define: {
        timestamps: true,
        underscored: false,
        freezeTableName: true,
      },

      timezone: '+00:00',
      dialectOptions: process.env.DB_SSL === 'true' || process.env.NODE_ENV === 'production' ? {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      } : {}
    }
  );
}


// Test database connection with retry logic
const testConnection = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('✓ Database connection established successfully.');
      return true;
    } catch (error) {
      console.log(`✗ Database connection attempt ${i + 1}/${retries} failed: ${error.message}`);
      if (i < retries - 1) {
        console.log(`  Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('✗ Unable to connect to the database after all retries.');
        console.error('  Make sure DATABASE_URL is set correctly in environment variables.');
        return false;
      }
    }
  }
  return false;
};

module.exports = { sequelize, testConnection };
