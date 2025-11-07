# 🔄 Server Restart Instructions

## ✅ Issue Fixed!

The `GOOGLE_TTS_API_KEY` was missing from your `.env` file. It has now been added.

---

## 🚀 How to Restart Your Servers

### 1. Stop Current Servers

In your terminals, press:
```
Ctrl + C
```

Do this for both:
- Backend terminal (node server)
- Frontend terminal (vite dev server)

### 2. Restart Backend

```bash
cd backend
npm start
```

**Expected output:**
```
🎤 TTS Configuration:
   Google TTS API Key: ✅ Configured
   ElevenLabs API Key: ✅ Configured
   Twilio: ✅ Always available (fallback)

🚀 Server running on port 5001
```

### 3. Restart Frontend

```bash
cd frontend
npm run dev
```

---

## 🧪 Test the Integration

### Option 1: Test via Browser
Open: `http://localhost:5001/api/calls/test-google-tts`

Expected response:
```json
{
  "success": true,
  "message": "Google TTS working perfectly!",
  "audioUrl": "http://localhost:5001/audio/...",
  "source": "google",
  "voiceUsed": "NEERJA"
}
```

### Option 2: Test via Terminal
```bash
curl http://localhost:5001/api/calls/test-google-tts
```

### Option 3: Make a Real Call
1. Go to your frontend: `http://localhost:5173`
2. Create a module
3. Make a test call
4. Listen to the beautiful Indian English voice!

---

## 🎤 What Changed

### Before:
```
Try ElevenLabs → (fails) → Twilio Polly
```
- ❌ ElevenLabs failing (free tier model deprecated)
- ❌ Falling back to basic Polly voice
- ❌ No Indian accent

### After:
```
Try Google TTS → Try ElevenLabs → Twilio Polly
```
- ✅ Google TTS with Indian voices (PRIMARY)
- ✅ Beautiful Neerja/Prabhat voices
- ✅ Free for 2,000 calls/month
- ✅ Reliable and high quality

---

## 📊 Verify Everything is Working

Run this command to check all environment variables:
```bash
cd backend
node check-env.js
```

Expected output:
```
✅ GOOGLE_TTS_API_KEY        AIzaSyAoJz...v4gE
✅ TTS Configuration: OK
   Primary: Google TTS (Indian voices)
```

---

## 🐛 If You Still See Errors

### Error: "Google TTS API key not configured"
**Solution:** 
1. Stop the server (Ctrl+C)
2. Run: `node check-env.js` to verify
3. If still missing, run: `./add-google-tts-key.sh`
4. Restart server

### Error: "Failed to load resource"
**Solution:**
1. Make sure backend is running on port 5001
2. Check: `http://localhost:5001/api/health`
3. Verify no other process is using port 5001

### Error: "Twilio authentication failed"
**Solution:**
This is expected in development without valid Twilio credentials.
The TTS system will still work for testing via the test endpoints.

---

## 🎉 Success Indicators

You'll know it's working when you see:

1. ✅ Server starts with "Google TTS API Key: ✅ Configured"
2. ✅ Test endpoint returns success
3. ✅ No more "Google TTS API key not configured" errors
4. ✅ Calls use Indian English voice (Neerja/Prabhat)

---

## 📞 Next Steps

1. **Restart both servers** (backend + frontend)
2. **Test the API**: Visit `http://localhost:5001/api/calls/test-google-tts`
3. **Make a test call**: Use your frontend
4. **Enjoy the Indian voice!** 🎤🇮🇳

---

**Need help?** Check the logs in your terminal for detailed error messages.
