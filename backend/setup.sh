#!/bin/bash

# Vok.AI Backend Setup Script
echo "🚀 Setting up Vok.AI Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your actual credentials before starting the server"
    echo "🔑 Required credentials:"
    echo "   - TWILIO_ACCOUNT_SID"
    echo "   - TWILIO_AUTH_TOKEN" 
    echo "   - TWILIO_PHONE_NUMBER"
    echo "   - GEMINI_API_KEY"
    echo "   - MONGODB_URI"
    echo "   - JWT_SECRET"
else
    echo "✅ .env file already exists"
fi

# Check if MongoDB is running
echo "🗄️  Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    if mongosh --eval "db.runCommand('ping')" --quiet &> /dev/null; then
        echo "✅ MongoDB is running"
    else
        echo "⚠️  MongoDB is not running. Please start MongoDB first."
        echo "   On macOS: brew services start mongodb-community"
        echo "   On Ubuntu: sudo systemctl start mongod"
        echo "   On Windows: Start MongoDB service from Services"
    fi
else
    echo "⚠️  MongoDB client not found. Please install MongoDB first."
fi

# Create applications directory if it doesn't exist
mkdir -p applications

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your credentials"
echo "2. Start MongoDB if not running"
echo "3. Run: npm run dev (for development)"
echo "4. Run: npm start (for production)"
echo ""
echo "🔗 Useful commands:"
echo "   npm run dev          - Start development server"
echo "   npm start            - Start production server"
echo "   npm run setup-db     - Setup database"
echo "   npm run test-connection - Test database connection"
echo ""
echo "📚 Documentation:"
echo "   - TWILIO_SETUP.md    - Twilio configuration guide"
echo "   - DATABASE_SETUP.md  - Database setup guide"
echo "   - README.md          - General project information"
