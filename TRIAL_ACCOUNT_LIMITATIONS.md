# Twilio Trial Account Limitations

## Issue Description

If you're getting an error like:
> "Call failed: The number +91XXXXXXXXXX is unverified. Trial accounts may only make calls to verified numbers."

This is **NOT** a bug in your application. This is a limitation of Twilio's trial accounts.

## Why This Happens

1. **Twilio Trial Account Restrictions**: Trial accounts can only make calls to phone numbers that have been verified in your Twilio console.

2. **Your Working Number**: The number `+91 8595192809` works because it's likely been verified in your Twilio account.

3. **Other Numbers**: Numbers like `+918252147105` fail because they haven't been verified yet.

## Solutions

### Option 1: Verify Phone Numbers (Recommended for Testing)

1. **Log into Twilio Console**: Go to [console.twilio.com](https://console.twilio.com)
2. **Navigate to Verified Caller IDs**: 
   - Go to "Phone Numbers" → "Verified Caller IDs"
   - Or search for "Verified Caller IDs" in the console
3. **Add Phone Numbers**: Click "Add a new Caller ID" and enter the phone numbers you want to test with
4. **Wait for Verification**: Most numbers are verified instantly, especially if they're your own numbers

### Option 2: Upgrade to Paid Account

1. **Upgrade Your Twilio Account**: Go to your Twilio console
2. **Add Payment Method**: Add a credit card to your account
3. **Remove Limitations**: Once upgraded, you can call any valid phone number without verification

### Option 3: Use Your Own Numbers for Testing

For testing purposes, you can:
- Use your own phone numbers
- Use numbers of friends/family (with their permission)
- Use test numbers provided by Twilio

## How to Verify Numbers

### Step-by-Step Process:

1. **Access Twilio Console**
   ```
   https://console.twilio.com
   ```

2. **Find Verified Caller IDs**
   - Look for "Phone Numbers" in the left sidebar
   - Click on "Verified Caller IDs"

3. **Add New Number**
   - Click "Add a new Caller ID"
   - Enter the phone number in international format (e.g., +91XXXXXXXXXX)
   - Click "Add Caller ID"

4. **Complete Verification**
   - Twilio will send a verification code via SMS
   - Enter the code to complete verification

## Error Codes

The application now provides specific error messages for different scenarios:

- **UNVERIFIED_NUMBER**: Phone number not verified in Twilio
- **INVALID_NUMBER**: Phone number format is incorrect
- **Insufficient tokens**: Not enough tokens to make the call

## Testing Your Setup

You can test your Twilio configuration using these endpoints:

1. **Test Twilio Configuration**: `GET /api/calls/test-twilio`
2. **Check Call Cost Info**: `GET /api/calls/cost-info`

## Common Questions

### Q: Is my number hardcoded?
**A**: No, there's no hardcoded number. The issue is with Twilio's trial account limitations.

### Q: Why does one number work but others don't?
**A**: The working number is likely verified in your Twilio account, while others aren't.

### Q: How do I know if a number is verified?
**A**: Check your Twilio Console → Phone Numbers → Verified Caller IDs

### Q: Can I call any number after upgrading?
**A**: Yes, paid Twilio accounts can call any valid phone number without verification.

## Support

If you continue to have issues:

1. Check your Twilio console for verified numbers
2. Ensure your Twilio credentials are properly configured
3. Consider upgrading to a paid account for production use

## Environment Variables

Make sure these are set in your environment:

```
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

## Next Steps

1. **For Testing**: Verify the phone numbers you want to test with
2. **For Production**: Consider upgrading to a paid Twilio account
3. **For Development**: Use your own verified numbers for testing 