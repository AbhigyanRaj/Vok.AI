import mongoose from 'mongoose';

// Check if database is connected
export const isDBConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Get database status
export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  return states[mongoose.connection.readyState] || 'unknown';
};

// Mock user for testing when DB is not available
export const getMockUser = (userId = 'mock-user-id') => ({
  _id: userId,
  name: 'Test User',
  email: 'test@example.com',
  tokens: 100,
  subscription: 'free',
  totalCallsMade: 0,
  isActive: true
});

// Mock module for testing when DB is not available
export const getMockModule = (moduleId = 'mock-module-id') => ({
  _id: moduleId,
  name: 'Test Module',
  description: 'A test module for development',
  isActive: true,
  userId: 'mock-user-id'
}); 