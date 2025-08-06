# MongoDB Database Setup Guide

This guide will help you set up MongoDB for the Vok.AI project.

## Prerequisites

1. **MongoDB Atlas Account**: You need a MongoDB Atlas account (free tier available)
2. **Node.js**: Version 16 or higher
3. **Environment Variables**: Configure your `.env` file

## Step 1: Environment Configuration

Create a `.env` file in the `backend` directory with the following variables:

```env
# Server Configuration
PORT=5001
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=your_mongodb_connection_string_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# GeminiAI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Base URL
BASE_URL=http://localhost:5001
```

## Step 2: Install Dependencies

```bash
cd backend
npm install
```

## Step 3: Database Setup

Run the database setup script to initialize the database:

```bash
npm run setup-db
```

This script will:
- Connect to MongoDB
- Create necessary indexes
- Create test data (in development mode)

## Step 4: Start the Server

```bash
npm run dev
```

The server will start on port 5001 (or the port specified in your .env file).

## Step 5: Verify Database Connection

Check the database health by visiting:
- `http://localhost:5001/api/health` - General health check
- `http://localhost:5001/api/db/status` - Database-specific status

## Database Schema

### Users Collection
- `email` (String, required, unique)
- `name` (String, required)
- `tokens` (Number, default: 100)
- `googleId` (String, unique, sparse)
- `isActive` (Boolean, default: true)
- `totalCallsMade` (Number, default: 0)
- `subscription` (String, enum: ['free', 'basic', 'premium'])

### Modules Collection
- `userId` (ObjectId, ref: 'User', required)
- `name` (String, required)
- `description` (String)
- `type` (String, enum: ['loan', 'credit_card', 'custom'])
- `questions` (Array of question objects)
- `isActive` (Boolean, default: true)
- `totalCalls` (Number, default: 0)
- `successfulCalls` (Number, default: 0)

### Calls Collection
- `userId` (ObjectId, ref: 'User', required)
- `moduleId` (ObjectId, ref: 'Module', required)
- `customerName` (String, required)
- `phoneNumber` (String, required)
- `twilioCallSid` (String, required, unique)
- `status` (String, enum: call statuses)
- `duration` (Number, default: 0)
- `responses` (Map of String)
- `transcription` (String)
- `summary` (String)
- `evaluation` (Object with result and comments)
- `recordingUrl` (String)
- `currentStep` (Number, default: 0)
- `tokensUsed` (Number, default: 1)

## Troubleshooting

### Connection Issues
1. **Check MongoDB URI**: Ensure your `MONGODB_URI` is correct
2. **Network Access**: Make sure your IP is whitelisted in MongoDB Atlas
3. **Credentials**: Verify username and password in the connection string

### Common Errors
- **ECONNREFUSED**: Check if MongoDB Atlas is accessible
- **Authentication failed**: Verify username/password
- **Network timeout**: Check internet connection and firewall settings

### Development Mode
The application includes fallback mechanisms for development:
- Mock data when database is unavailable
- Graceful error handling
- Detailed logging for debugging

## API Endpoints

### Health Check
- `GET /api/health` - General health status
- `GET /api/db/status` - Database-specific status

### Authentication
- `POST /api/auth/google` - Google OAuth login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `POST /api/auth/buy-tokens` - Purchase tokens
- `GET /api/auth/stats` - Get user statistics

### Modules
- `GET /api/modules` - Get user modules
- `POST /api/modules` - Create new module
- `PUT /api/modules/:id` - Update module
- `DELETE /api/modules/:id` - Delete module

### Calls
- `GET /api/calls` - Get user calls
- `POST /api/calls` - Create new call
- `GET /api/calls/:id` - Get call details
- `PUT /api/calls/:id` - Update call

## Security Notes

1. **Environment Variables**: Never commit `.env` files to version control
2. **MongoDB Atlas**: Use IP whitelisting for production
3. **JWT Secrets**: Use strong, unique secrets in production
4. **Rate Limiting**: Already configured in the application

## Production Considerations

1. **Database**: Use MongoDB Atlas production cluster
2. **Environment**: Set `NODE_ENV=production`
3. **Monitoring**: Enable MongoDB Atlas monitoring
4. **Backups**: Configure automated backups
5. **Scaling**: Consider read replicas for high traffic 