#!/bin/bash

# Add Google TTS API Key to .env file

ENV_FILE=".env"
API_KEY="AIzaSyAoJzQB5aPTPDCnyKwVwTtlFkEC-LWv4gE"

# Check if .env exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ .env file not found!"
    exit 1
fi

# Check if GOOGLE_TTS_API_KEY already exists
if grep -q "GOOGLE_TTS_API_KEY" "$ENV_FILE"; then
    echo "⚠️  GOOGLE_TTS_API_KEY already exists in .env"
    echo "Current value:"
    grep "GOOGLE_TTS_API_KEY" "$ENV_FILE"
    echo ""
    echo "Updating to new value..."
    # Update existing key
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/^GOOGLE_TTS_API_KEY=.*/GOOGLE_TTS_API_KEY=$API_KEY/" "$ENV_FILE"
    else
        # Linux
        sed -i "s/^GOOGLE_TTS_API_KEY=.*/GOOGLE_TTS_API_KEY=$API_KEY/" "$ENV_FILE"
    fi
else
    echo "Adding GOOGLE_TTS_API_KEY to .env..."
    # Add after GOOGLE_CLIENT_SECRET
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "/^GOOGLE_CLIENT_SECRET=/a\\
\\
# Google Cloud TTS Configuration (Recommended - Indian English voices)\\
GOOGLE_TTS_API_KEY=$API_KEY
" "$ENV_FILE"
    else
        # Linux
        sed -i "/^GOOGLE_CLIENT_SECRET=/a\\\\n# Google Cloud TTS Configuration (Recommended - Indian English voices)\\nGOOGLE_TTS_API_KEY=$API_KEY" "$ENV_FILE"
    fi
fi

echo "✅ Google TTS API Key added successfully!"
echo ""
echo "Verifying..."
grep "GOOGLE_TTS_API_KEY" "$ENV_FILE"
echo ""
echo "🎉 Done! Restart your server to apply changes."
