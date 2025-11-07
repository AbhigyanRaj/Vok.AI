#!/bin/bash

# Update Twilio credentials in .env file

ENV_FILE=".env"

# New Twilio credentials - Replace with your actual credentials
NEW_ACCOUNT_SID="YOUR_TWILIO_ACCOUNT_SID"
NEW_AUTH_TOKEN="YOUR_TWILIO_AUTH_TOKEN"
NEW_PHONE_NUMBER="YOUR_TWILIO_PHONE_NUMBER"

echo "🔄 Updating Twilio credentials in .env..."

# Update TWILIO_ACCOUNT_SID
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/^TWILIO_ACCOUNT_SID=.*/TWILIO_ACCOUNT_SID=$NEW_ACCOUNT_SID/" "$ENV_FILE"
    sed -i '' "s/^TWILIO_AUTH_TOKEN=.*/TWILIO_AUTH_TOKEN=$NEW_AUTH_TOKEN/" "$ENV_FILE"
    sed -i '' "s|^TWILIO_PHONE_NUMBER=.*|TWILIO_PHONE_NUMBER=$NEW_PHONE_NUMBER|" "$ENV_FILE"
else
    # Linux
    sed -i "s/^TWILIO_ACCOUNT_SID=.*/TWILIO_ACCOUNT_SID=$NEW_ACCOUNT_SID/" "$ENV_FILE"
    sed -i "s/^TWILIO_AUTH_TOKEN=.*/TWILIO_AUTH_TOKEN=$NEW_AUTH_TOKEN/" "$ENV_FILE"
    sed -i "s|^TWILIO_PHONE_NUMBER=.*|TWILIO_PHONE_NUMBER=$NEW_PHONE_NUMBER|" "$ENV_FILE"
fi

echo "✅ Twilio credentials updated!"
echo ""
echo "New values:"
grep "TWILIO_" "$ENV_FILE"
echo ""
echo "🔄 Please restart your server for changes to take effect:"
echo "   1. Stop server (Ctrl+C)"
echo "   2. Run: npm start"
