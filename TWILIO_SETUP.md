# 📞 Twilio Configuration Guide

## ✅ Credentials Setup

Add your Twilio credentials to the `.env` file:
```
TWILIO_ACCOUNT_SID=YOUR_ACCOUNT_SID
TWILIO_AUTH_TOKEN=YOUR_AUTH_TOKEN
TWILIO_PHONE_NUMBER=YOUR_PHONE_NUMBER
```

---

## 🚨 Important Setup Steps

### 1. **A2P 10DLC Registration Required**
For US phone numbers sending SMS/MMS, A2P 10DLC registration is required.

**What to do:**
- This is **OPTIONAL** for voice calls (you can ignore for now)
- Required if you plan to send SMS messages
- Follow Twilio's A2P 10DLC registration process in your console

### 2. **Get Your Credentials**
1. Log in to [Twilio Console](https://console.twilio.com/)
2. Find your Account SID and Auth Token on the dashboard
3. Purchase a phone number or use an existing one
4. Add these to your `.env` file

### 3. **Test Your Setup**
Run the backend server and test a call to verify everything works:
```bash
cd backend
npm start
```

---

## 📝 Notes
- Keep your credentials secure and never commit them to git
- Use environment variables for all sensitive data
- The `.env` file is gitignored by default
