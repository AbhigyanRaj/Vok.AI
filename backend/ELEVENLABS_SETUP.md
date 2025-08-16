# 🚀 ELEVENLABS PRODUCTION SETUP GUIDE

## 🎯 **OVERVIEW**
This guide will help you set up ElevenLabs for production use with your Vok.AI calling system. The implementation includes:
- **Production-grade error handling**
- **Intelligent rate limiting**
- **Automatic fallback to Twilio TTS**
- **Audio caching for performance**
- **Comprehensive monitoring**

## 🔑 **STEP 1: CREATE A CLEAN ELEVENLABS ACCOUNT**

### **1.1 Use a Different Network/IP**
- **Don't use the same IP** where your previous accounts were created
- **Use a different device** (mobile hotspot, different WiFi, etc.)
- **Use incognito/private browsing mode**

### **1.2 Account Creation Process**
1. Go to [ElevenLabs.io](https://elevenlabs.io)
2. **Use a completely new email** (Gmail, Outlook, etc.)
3. **Use a different name** than your previous accounts
4. **Verify your email** immediately
5. **Don't use VPN/proxy** during account creation

### **1.3 Get Your API Key**
1. After verification, go to your profile
2. Click on "API Key" in the left sidebar
3. Copy your new API key (starts with `sk_`)

## ⚙️ **STEP 2: ENVIRONMENT CONFIGURATION**

### **2.1 Update Your .env File**
```env
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_new_api_key_here

# Base URL for your backend
BASE_URL=http://localhost:5001

# Other required variables...
```

### **2.2 Restart Your Backend Server**
```bash
cd backend
npm run dev
```

## 🧪 **STEP 3: TESTING & VALIDATION**

### **3.1 Run the Production Test Suite**
```bash
cd backend
node test-production-tts.js
```

### **3.2 Expected Results**
- ✅ **Connection Test**: Should show "SUCCESS"
- ✅ **TTS Generation**: Should generate audio with ElevenLabs
- ✅ **Health Check**: Should show "HEALTHY" status
- ✅ **Performance**: Response time under 5 seconds

### **3.3 If Tests Fail**
- Check your API key is correct
- Verify your .env file is loaded
- Check network connectivity
- Review error messages in the test output

## 🏗️ **STEP 4: PRODUCTION DEPLOYMENT**

### **4.1 Update Production Environment**
- Set `NODE_ENV=production` in your production .env
- Update `BASE_URL` to your production domain
- Ensure `ELEVENLABS_API_KEY` is set

### **4.2 Monitor Production Logs**
The system will automatically log:
- API request attempts
- Success/failure rates
- Rate limiting information
- Cache performance
- Fallback usage

### **4.3 Health Monitoring**
Use the health check endpoint:
```
GET /api/calls/health-elevenlabs
```

## 🛡️ **STEP 5: PRODUCTION BEST PRACTICES**

### **5.1 Rate Limiting**
- **Free Tier**: 10,000 characters/month
- **Current Limits**: 50 requests/minute, 1000/hour
- **Automatic Throttling**: Built into the system

### **5.2 Caching Strategy**
- **Audio Cache**: 24-hour expiry
- **Voice Info Cache**: Reduces API calls
- **Automatic Cleanup**: Every hour

### **5.3 Fallback System**
- **Primary**: ElevenLabs TTS
- **Fallback**: Twilio TTS
- **Seamless**: Users won't notice the switch

## 🔍 **STEP 6: TROUBLESHOOTING**

### **6.1 Common Issues**

#### **Issue: 401 Unauthorized**
**Cause**: Account restriction or invalid API key
**Solution**: 
- Create a new account with different IP
- Verify API key is correct
- Check account status in ElevenLabs dashboard

#### **Issue: Rate Limit Exceeded**
**Cause**: Too many requests
**Solution**:
- Wait for rate limit to reset
- Implement request batching
- Consider upgrading to paid plan

#### **Issue: Audio Not Playing**
**Cause**: File path or URL issues
**Solution**:
- Check audio directory exists
- Verify BASE_URL is correct
- Check file permissions

### **6.2 Debug Commands**
```bash
# Test connection
curl -X GET "https://api.elevenlabs.io/v1/voices" \
  -H "xi-api-key: YOUR_API_KEY"

# Check environment
node -e "console.log(process.env.ELEVENLABS_API_KEY)"

# Run health check
node -e "import('./src/config/elevenlabs.js').then(m => m.healthCheck().then(console.log))"
```

## 📊 **STEP 7: MONITORING & METRICS**

### **7.1 Key Metrics to Watch**
- **Success Rate**: Should be >95%
- **Response Time**: Should be <5 seconds
- **Fallback Usage**: Should be <10%
- **Cache Hit Rate**: Should be >80%

### **7.2 Log Analysis**
```bash
# Filter ElevenLabs logs
grep "ElevenLabs:" your-app.log

# Check error rates
grep "ERROR.*ElevenLabs" your-app.log | wc -l
```

## 🚀 **STEP 8: SCALING & OPTIMIZATION**

### **8.1 Performance Optimization**
- **Batch Requests**: Group multiple TTS calls
- **Pre-generate**: Common phrases in advance
- **CDN**: Serve audio files from CDN

### **8.2 Cost Optimization**
- **Free Tier**: 10,000 characters/month
- **Paid Plans**: Start at $22/month
- **Bulk Discounts**: Available for high usage

## 🎉 **SUCCESS CRITERIA**

Your ElevenLabs integration is working when:
1. ✅ **Connection test passes**
2. ✅ **TTS generation works**
3. ✅ **Audio files are created**
4. ✅ **Calls use ElevenLabs voices**
5. ✅ **Fallback system works seamlessly**
6. ✅ **Performance is acceptable**

## 📞 **SUPPORT**

If you encounter issues:
1. **Check the logs** for detailed error messages
2. **Run the test suite** to isolate problems
3. **Verify your account status** in ElevenLabs dashboard
4. **Contact ElevenLabs support** for account issues

---

**🎯 Remember**: This is a production-grade implementation designed to handle failures gracefully. Even if ElevenLabs has issues, your calls will continue to work with Twilio TTS fallback.



