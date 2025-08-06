import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';

dotenv.config();

const testUserModel = async () => {
  try {
    console.log('🔧 Testing User model...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Test creating a user
    const testUserData = {
      email: 'test@example.com',
      name: 'Test User',
      googleId: 'test-google-id'
    };
    
    console.log('Creating test user with data:', testUserData);
    
    const user = await User.create(testUserData);
    console.log('✅ User created successfully:', user);
    
    // Clean up
    await User.findByIdAndDelete(user._id);
    console.log('✅ Test user cleaned up');
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ User model test failed:', error);
    console.error('Error details:', error.message);
    if (error.errors) {
      console.error('Validation errors:', error.errors);
    }
  }
};

testUserModel(); 