import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { getDBStatus } from './utils/dbUtils.js';
import { initializeDatabase, checkDatabaseHealth } from './utils/initDB.js';
import authRoutes from './routes/auth.js';
import moduleRoutes from './routes/modules.js';
import callRoutes from './routes/calls.js';
import userRoutes from './routes/users.js';

dotenv.config();

// Debug: Check if environment variables are loaded
console.log('Environment check:');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Loaded' : 'NOT LOADED');
console.log('PORT:', process.env.PORT);

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://vok-ai.onrender.com', 'https://vok-ai.vercel.app'] // Vercel frontend domain
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Connect to MongoDB and initialize
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    
    // Initialize database (create indexes, etc.)
    if (process.env.NODE_ENV === 'development') {
      await initializeDatabase();
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Database Status: ${getDBStatus()}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/modules', moduleRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/users', userRoutes);

// Health check with detailed database info
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    
    res.json({ 
      status: 'OK', 
      message: 'Vok.AI API is running',
      database: dbHealth,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      message: 'Health check failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Database status endpoint
app.get('/api/db/status', async (req, res) => {
  try {
    const dbHealth = await checkDatabaseHealth();
    res.json(dbHealth);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to get database status',
      message: error.message 
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server
startServer(); 