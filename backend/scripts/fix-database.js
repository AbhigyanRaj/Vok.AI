import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const fixDatabase = async () => {
  try {
    console.log('🔧 Fixing database indexes...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Get the database
    const db = mongoose.connection.db;
    
    // List all indexes
    const collections = await db.listCollections().toArray();
    console.log('📚 Collections found:', collections.map(c => c.name));
    
    // Check for problematic indexes
    for (const collection of collections) {
      const indexes = await db.collection(collection.name).indexes();
      console.log(`📊 Indexes for ${collection.name}:`, indexes.map(i => i.name));
      
      // Remove username index if it exists
      if (collection.name === 'users') {
        const usernameIndex = indexes.find(i => i.name === 'username_1');
        if (usernameIndex) {
          console.log('🗑️  Removing problematic username index...');
          await db.collection('users').dropIndex('username_1');
          console.log('✅ Username index removed');
        }
      }
    }
    
    // Drop and recreate all indexes for users collection
    console.log('🔄 Recreating user indexes...');
    await db.collection('users').dropIndexes();
    console.log('✅ All user indexes dropped');
    
    // The indexes will be recreated when the server starts
    console.log('✅ Database fix completed!');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Database fix failed:', error);
  }
};

fixDatabase(); 