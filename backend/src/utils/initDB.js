import mongoose from 'mongoose';
import User from '../models/User.js';
import Module from '../models/Module.js';
import Call from '../models/Call.js';

// Initialize database indexes and validation
export const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing database...');
    
    // Create indexes for better performance
    await User.createIndexes();
    await Module.createIndexes();
    await Call.createIndexes();
    
    console.log('✅ Database indexes created successfully');
    
    // Validate database connection
    const dbState = mongoose.connection.readyState;
    if (dbState === 1) {
      console.log('✅ Database connection is healthy');
      
      // Get database stats
      const stats = await mongoose.connection.db.stats();
      console.log(`📊 Database stats: ${stats.collections} collections, ${stats.dataSize} bytes`);
      
      return true;
    } else {
      console.log('⚠️  Database connection is not ready');
      return false;
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    return false;
  }
};

// Create a test user for development
export const createTestUser = async () => {
  try {
    const testUser = await User.findOne({ email: 'test@vokai.com' });
    
    if (!testUser) {
      const newUser = await User.create({
        email: 'test@vokai.com',
        name: 'Test User',
        tokens: 1000,
        subscription: 'premium',
        totalCallsMade: 0,
        isActive: true
      });
      
      console.log('✅ Test user created:', newUser.email);
      return newUser;
    } else {
      console.log('ℹ️  Test user already exists:', testUser.email);
      return testUser;
    }
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message);
    return null;
  }
};

// Create a test module for development
export const createTestModule = async (userId) => {
  try {
    const testModule = await Module.findOne({ 
      userId: userId,
      name: 'Test Loan Module'
    });
    
    if (!testModule) {
      const newModule = await Module.create({
        userId: userId,
        name: 'Test Loan Module',
        description: 'A test module for loan applications',
        type: 'loan',
        questions: [
          {
            question: 'What is your monthly income?',
            order: 1,
            required: true
          },
          {
            question: 'How long have you been employed?',
            order: 2,
            required: true
          },
          {
            question: 'What is the purpose of this loan?',
            order: 3,
            required: true
          }
        ],
        isActive: true,
        totalCalls: 0,
        successfulCalls: 0
      });
      
      console.log('✅ Test module created:', newModule.name);
      return newModule;
    } else {
      console.log('ℹ️  Test module already exists:', testModule.name);
      return testModule;
    }
  } catch (error) {
    console.error('❌ Failed to create test module:', error.message);
    return null;
  }
};

// Database health check
export const checkDatabaseHealth = async () => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    
    const health = {
      status: states[dbState] || 'unknown',
      connected: dbState === 1,
      collections: [],
      stats: null
    };
    
    if (dbState === 1) {
      // Get collection names
      const collections = await mongoose.connection.db.listCollections().toArray();
      health.collections = collections.map(col => col.name);
      
      // Get database stats
      health.stats = await mongoose.connection.db.stats();
    }
    
    return health;
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    return {
      status: 'error',
      connected: false,
      error: error.message
    };
  }
}; 