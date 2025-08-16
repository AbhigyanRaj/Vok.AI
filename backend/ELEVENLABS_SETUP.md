# ElevenLabs Integration Setup

## 🎯 Overview
This guide explains how to set up ElevenLabs TTS integration for Vok.AI voice calls.

## 🚀 Quick Setup

### 1. Environment Variables
Add to your `.env` file:
```env
ELEVENLABS_API_KEY=your_api_key_here
BASE_URL=https://vok-ai.onrender.com  # For production
```

### 2. Local Development
For local testing with Twilio calls:
```bash
# Install ngrok
npm install -g ngrok

# Start ngrok
ngrok http 5001

# Set the ngrok URL as BASE_URL
export BASE_URL=https://your-ngrok-url.ngrok.io

# Restart your backend
npm run dev
```

## 🧪 Testing

### Test Endpoints
- **URL Generation**: `GET /api/calls/test-url-generation`
- **TwiML with ElevenLabs**: `GET /api/calls/test-twillml-elevenlabs`
- **Hybrid Status**: `GET /api/calls/hybrid-status`
- **ElevenLabs Status**: `GET /api/calls/test-elevenlabs-status`

### Test Commands
```bash
# Test URL generation
curl http://localhost:5001/api/calls/test-url-generation

# Test TwiML generation
curl http://localhost:5001/api/calls/test-twillml-elevenlabs

# Check hybrid system status
curl http://localhost:5001/api/calls/hybrid-status
```

## 🎤 How It Works

### Smart Hybrid System
- **High Priority**: Greeting, First Question, Outro (uses ElevenLabs)
- **Medium Priority**: Key Questions (uses ElevenLabs if within limits)
- **Low Priority**: Confirmations, Decline messages (uses Twilio TTS)

### Rate Limiting
- **Per Call**: 3 ElevenLabs requests maximum
- **Per Minute**: 5 ElevenLabs requests maximum
- **Per Hour**: 20 ElevenLabs requests maximum

### Fallback System
- If ElevenLabs fails → automatically uses Twilio TTS
- If rate limits reached → uses Twilio TTS
- 100% reliability guaranteed

## 🌍 Environment Support

### Local Development
- Uses `http://localhost:5001` for audio URLs
- Perfect for development and testing

### Production (Render)
- Uses `https://vok-ai.onrender.com` for audio URLs
- Automatically detected when `NODE_ENV=production`

### Custom Testing
- Set `BASE_URL` environment variable
- Overrides default behavior

## 📊 Monitoring

### Hybrid System Status
Check current usage and limits:
```bash
curl http://localhost:5001/api/calls/hybrid-status
```

### Response Format
```json
{
  "success": true,
  "status": {
    "currentUsage": {
      "perMinute": 2,
      "perHour": 5,
      "activeCalls": 1
    },
    "limits": {
      "perCall": 3,
      "perMinute": 5,
      "perHour": 20
    },
    "health": {
      "systemStatus": "operational"
    }
  }
}
```

## 🔧 Troubleshooting

### Common Issues

1. **Audio not playing in calls**
   - Check if audio files are accessible via URL
   - Verify BASE_URL is set correctly
   - Test with ngrok for local development

2. **ElevenLabs API errors**
   - Check API key validity
   - Verify account status (free vs paid)
   - Check rate limits

3. **Rate limiting issues**
   - Monitor usage with hybrid-status endpoint
   - Adjust limits in HYBRID_CONFIG if needed

### Debug Commands
```bash
# Check audio file accessibility
curl -I "http://localhost:5001/audio/filename.mp3"

# Test ElevenLabs connection
curl http://localhost:5001/api/calls/test-elevenlabs-status

# Check TwiML generation
curl http://localhost:5001/api/calls/test-twillml-elevenlabs
```

## 🎯 Best Practices

1. **Use ngrok for local testing** - Ensures Twilio can access your audio files
2. **Monitor usage** - Check hybrid-status regularly
3. **Test thoroughly** - Use test endpoints before making real calls
4. **Keep API key secure** - Never commit to version control

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review the logs in your terminal
3. Test with the provided endpoints
4. Verify your ElevenLabs account status



