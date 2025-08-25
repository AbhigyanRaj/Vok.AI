# Quick ngrok Setup for ElevenLabs Voice

## Step 1: Sign up for ngrok (Free)
1. Go to https://dashboard.ngrok.com/signup
2. Sign up with your email
3. Verify your email address

## Step 2: Get your authtoken
1. Go to https://dashboard.ngrok.com/get-started/your-authtoken
2. Copy your authtoken

## Step 3: Install authtoken
```bash
ngrok config add-authtoken YOUR_AUTHTOKEN_HERE
```

## Step 4: Start ngrok tunnel
```bash
cd /Users/abhigyanraj/Desktop/Placements/Projects/Vok.AI/backend
ngrok http 5001
```

## Step 5: Update environment
1. Copy the https URL from ngrok (e.g., https://abc123.ngrok.io)
2. Set BASE_URL in your .env file:
```bash
BASE_URL=https://abc123.ngrok.io
```

## Step 6: Restart backend
```bash
npm run dev
```

## ✅ Test Your Voice
Make a call - you should now hear your selected ElevenLabs voice!

## Notes
- Keep ngrok running while testing calls
- The ngrok URL changes each time you restart (unless you have a paid plan)
- Update BASE_URL each time you restart ngrok
