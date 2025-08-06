import dotenv from 'dotenv';
import connectDB from '../src/config/database.js';
import { initializeDatabase, createTestUser, createTestModule } from '../src/utils/initDB.js';

dotenv.config();

const setupDatabase = async () => {
  try {
    console.log('🚀 Starting database setup...');
    
    // Connect to MongoDB
    await connectDB();
    
    // Initialize database (create indexes)
    await initializeDatabase();
    
    // Create test data in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔧 Creating test data...');
      
      // Create test user
      const testUser = await createTestUser();
      
      if (testUser) {
        // Create test module
        await createTestModule(testUser._id);
      }
    }
    
    console.log('✅ Database setup completed successfully!');
    console.log('📊 You can now start your server with: npm run dev');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
};

// Run the setup
setupDatabase(); 