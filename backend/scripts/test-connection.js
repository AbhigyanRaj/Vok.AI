import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const testConnection = async () => {
  try {
    console.log('🔍 Testing MongoDB connection...');
    console.log('📡 URI:', process.env.MONGODB_URI ? 'Loaded' : 'NOT LOADED');
    
    // Test basic connection
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connection successful!');
    console.log(`🌐 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔗 State: ${conn.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    
    // Test a simple operation
    const collections = await conn.connection.db.listCollections().toArray();
    console.log(`📚 Collections found: ${collections.length}`);
    
    await mongoose.disconnect();
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    
    if (error.message.includes('bad auth')) {
      console.log('\n🔐 Authentication Error - Possible solutions:');
      console.log('1. Check username and password in MongoDB Atlas');
      console.log('2. Reset the database user password');
      console.log('3. Verify the MONGODB_URI format');
    } else if (error.message.includes('whitelist')) {
      console.log('\n🌐 IP Whitelist Error - Add your IP to MongoDB Atlas');
    } else {
      console.log('\n❓ Unknown error - Check your MongoDB Atlas configuration');
    }
  }
};

testConnection(); 