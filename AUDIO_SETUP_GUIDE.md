# Audio Setup Guide for Vok.AI

## Problem: No Audio During Calls

The issue occurs because Twilio needs publicly accessible URLs to play ElevenLabs-generated audio files during live calls. When running locally, `localhost:5001` URLs are not accessible to Twilio's servers.

## Solution 1: Quick Fix (Twilio TTS Fallback) ✅ IMPLEMENTED

The code now automatically detects when no public URL is available and falls back to Twilio TTS, ensuring you always hear audio during calls.

**Current Status**: You should now hear Twilio TTS audio during calls.

## Solution 2: Full ElevenLabs Audio (Recommended for Production)

To use ElevenLabs audio during calls, you need a publicly accessible URL.

### Option A: Using ngrok (Local Development)

1. **Install ngrok**:
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/download
   ```

2. **Start your backend server**:
   ```bash
   cd backend
   npm run dev
   ```

3. **In a new terminal, start ngrok**:
   ```bash
   ngrok http 5001
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

5. **Set environment variable**:
   ```bash
   export BASE_URL=https://abc123.ngrok.io
   # Or add to your .env file:
   # BASE_URL=https://abc123.ngrok.io
   ```

6. **Restart your backend server** to pick up the new BASE_URL

### Option B: Deploy to Production

Deploy your backend to a cloud service like:
- Render.com
- Railway.app
- Vercel
- Heroku

## Testing Audio

### Test 1: Verify Twilio TTS is Working
```bash
# Make a test call - you should hear Twilio TTS audio
curl -X POST "http://localhost:5001/api/calls/initiate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "moduleId": "YOUR_MODULE_ID",
    "phoneNumber": "+1234567890",
    "customerName": "Test User"
  }'
```

### Test 2: Verify ElevenLabs Generation
```bash
# Test ElevenLabs TTS generation
curl "http://localhost:5001/api/calls/test-elevenlabs-tts"
```

### Test 3: Check Audio File Serving
```bash
# Test if audio files are accessible
curl -I "http://localhost:5001/audio/test_RACHEL_Hello_1234567890.mp3"
```

## Environment Variables

Add these to your `.env` file:

```env
# For ngrok setup
BASE_URL=https://your-ngrok-url.ngrok.io
NGROK_URL=https://your-ngrok-url.ngrok.io

# ElevenLabs API
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

## Troubleshooting

### No Audio During Calls
- ✅ **Fixed**: Code now automatically uses Twilio TTS when no public URL is available
- Check console logs for audio generation messages
- Verify Twilio credentials are correct

### ElevenLabs Not Working
- Check `ELEVENLABS_API_KEY` is set correctly
- Test with: `curl "http://localhost:5001/api/calls/test-elevenlabs-tts"`
- Check ElevenLabs API quota/limits

### Audio Files Not Accessible
- Ensure ngrok is running and BASE_URL is set
- Check audio directory exists: `backend/src/audio/`
- Verify file permissions

## Audio Flow Logic

1. **Check Public URL**: If no public URL available → Use Twilio TTS
2. **Generate ElevenLabs**: If public URL available → Try ElevenLabs
3. **Fallback**: If ElevenLabs fails → Use Twilio TTS
4. **Verify URL**: If generated URL is localhost → Use Twilio TTS

This ensures you always hear audio during calls, regardless of setup.
