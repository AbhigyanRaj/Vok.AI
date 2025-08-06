import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    console.log('⚠️  MongoDB connection failed - running without database');
    console.log('⚠️  Some features may not work properly');
    // Don't exit the process, just log the error
    // process.exit(1);
  }
};

export default connectDB; 