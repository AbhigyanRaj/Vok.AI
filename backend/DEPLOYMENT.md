# Vok.AI Backend Deployment Guide (Render)

## 🚀 Quick Setup for Render

### 1. Environment Variables Setup

In your Render dashboard, set these environment variables:

```bash
# Required
NODE_ENV=production
BASE_URL=https://vok-ai.onrender.com
FRONTEND_URL=https://vok-ai.vercel.app
RENDER=true

# Your actual API keys
ELEVENLABS_API_KEY=your_actual_elevenlabs_key
MONGODB_URI=your_actual_mongodb_connection_string
JWT_SECRET=your_actual_jwt_secret
TWILIO_ACCOUNT_SID=your_actual_twilio_sid
TWILIO_AUTH_TOKEN=your_actual_twilio_token
TWILIO_PHONE_NUMBER=your_actual_twilio_phone
GEMINI_API_KEY=your_actual_gemini_key
```

### 2. Build Command
```bash
npm install
```

### 3. Start Command
```bash
npm start
```

### 4. Health Check Endpoints

After deployment, test these endpoints:

- **Main Health**: `https://vok-ai.onrender.com/api/health`
- **Voice System Health**: `https://vok-ai.onrender.com/api/calls/voices/health`
- **Database Status**: `https://vok-ai.onrender.com/api/db/status`

## 🔧 Troubleshooting

### Voice Preview Not Working?

1. **Check ElevenLabs API Key**: Ensure `ELEVENLABS_API_KEY` is set in Render
2. **Check BASE_URL**: Must be `https://vok-ai.onrender.com`
3. **Check CORS**: Frontend URL must be `https://vok-ai.vercel.app`

### Common Issues

- **500 Error on `/voices/sample`**: Usually missing environment variables
- **CORS Errors**: Check if `FRONTEND_URL` is correct
- **Audio Files Not Loading**: Ensure `BASE_URL` is set correctly

## 📝 Environment Variable Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | ✅ | Must be `production` |
| `BASE_URL` | ✅ | Your Render backend URL |
| `FRONTEND_URL` | ✅ | Your Vercel frontend URL |
| `RENDER` | ✅ | Must be `true` |
| `ELEVENLABS_API_KEY` | ✅ | Your ElevenLabs API key |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for JWT tokens |
| `TWILIO_*` | ✅ | Twilio credentials |
| `GEMINI_API_KEY` | ✅ | Gemini API key |

## 🎯 Testing After Deployment

1. **Health Check**: `curl https://vok-ai.onrender.com/api/health`
2. **Voice Health**: `curl https://vok-ai.onrender.com/api/calls/voices/health`
3. **Voice Sample**: `curl "https://vok-ai.onrender.com/api/calls/voices/sample?voice=RACHEL"`

## 📞 Support

If you encounter issues:
1. Check Render logs for error messages
2. Verify all environment variables are set
3. Test health check endpoints
4. Check CORS configuration
