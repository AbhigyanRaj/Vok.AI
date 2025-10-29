import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables FIRST
dotenv.config();

// Validate environment variables
import { validateEnvironment } from './utils/envValidator.js';
if (!validateEnvironment()) {
  console.error('❌ Server cannot start due to missing environment variables');
  process.exit(1);
}

// Import database and utilities
import connectDB from './config/database.js';
import { getDBStatus } from './utils/dbUtils.js';
import { initializeDatabase, checkDatabaseHealth, checkAudioDirectoryHealth } from './utils/initDB.js';
import { initializeSharedAudioLibrary } from './services/audioCache.js';

// Import routes
import authRoutes from './routes/auth.js';
import moduleRoutes from './routes/modules.js';
import callRoutes from './routes/calls.js';
import userRoutes from './routes/users.js';
import { setupMediaStreamWebSocket } from './routes/mediaStream.js';
import { initializeLiveCallWebSocket } from './websocket/liveCallServer.js';
import http from 'http';


const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Debug: Check if environment variables are loaded

// Serve generated audio files statically with proper headers
app.use('/audio', (req, res, next) => {
  // Set CORS headers for audio files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  next();
}, express.static(path.resolve('src/audio')));

// Serve sample-audio files statically with proper headers
app.use('/sample-audio', (req, res, next) => {
  // Set CORS headers for sample audio files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, ngrok-skip-browser-warning');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
  next();
}, express.static(path.resolve('sample-audio')));

// Security middleware with relaxed settings for audio
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - Allow all origins in development
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://vok-ai.vercel.app', 'https://vok-ai.onrender.com']
    : true, // Allow all origins in development
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'ngrok-skip-browser-warning', 'Accept'],
  exposedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Trust proxy for rate limiting in production
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for health checks
  skip: (req) => req.path === '/api/health' || req.path === '/api/calls/voices/health'
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
    
    // Initialize shared audio library (only if ElevenLabs API key is set)
    // This will check cache first, so it won't regenerate existing audio
    if (process.env.ELEVENLABS_API_KEY) {
      console.log('🎤 Initializing shared audio library...');
      try {
        await initializeSharedAudioLibrary('RACHEL');
        console.log('✅ Shared audio library ready');
      } catch (error) {
        console.warn('⚠️ Failed to initialize shared audio library:', error.message);
        console.warn('   Calls will still work with Twilio TTS fallback');
      }
    } else {
      console.log('⚠️ ElevenLabs API key not set - skipping audio library initialization');
    }
    
    // Initialize WebSocket server for Media Streams
    setupMediaStreamWebSocket(httpServer);
    
    // Initialize WebSocket server for Live Call Monitoring
    initializeLiveCallWebSocket(httpServer);
    
    // Start the server
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log(`📊 Database Status: ${getDBStatus()}`);
      console.log(`🎤 WebSocket server ready for Twilio Media Streams`);
      console.log(`📡 Live Call Monitor WebSocket ready`);
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
    const audioHealth = await checkAudioDirectoryHealth();
    
    res.json({ 
      status: 'OK', 
      message: 'Vok.AI API is running',
      database: dbHealth,
      audio: audioHealth,
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