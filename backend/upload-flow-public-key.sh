#!/bin/bash

# WhatsApp Flow Public Key Upload Script
# This script uploads your public key to Meta using the WhatsApp Business Management API

# Configuration - UPDATE THESE VALUES
WABA_ID="YOUR_WHATSAPP_BUSINESS_ACCOUNT_ID"  # Find this in WhatsApp Manager settings
ACCESS_TOKEN="${WHATSAPP_API_TOKEN}"  # From your .env file
FLOW_ID="YOUR_FLOW_ID"  # The Flow ID from Meta Business Manager

# Read and format the public key (remove headers and newlines)
PUBLIC_KEY=$(cat flow_public_key.pem | grep -v "BEGIN PUBLIC KEY" | grep -v "END PUBLIC KEY" | tr -d '\n')

echo "📤 Uploading public key to WhatsApp Flow..."
echo "Flow ID: $FLOW_ID"
echo "Public Key (first 50 chars): ${PUBLIC_KEY:0:50}..."

# Upload the public key using WhatsApp Business Management API
RESPONSE=$(curl -X POST \
  "https://graph.facebook.com/v21.0/${FLOW_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"whatsapp_business_account\": \"${WABA_ID}\",
    \"categories\": [\"OTHER\"],
    \"endpoint_uri\": \"$(grep FRONTEND_URL .env | cut -d'=' -f2 | tr -d '\"')/api/v1/claims/submit\",
    \"public_key\": \"${PUBLIC_KEY}\"
  }")

echo ""
echo "Response:"
echo "$RESPONSE"

# Check if successful
if echo "$RESPONSE" | grep -q "success"; then
  echo ""
  echo "✅ Public key uploaded successfully!"
else
  echo ""
  echo "❌ Failed to upload public key. Check the error above."
  echo ""
  echo "Common issues:"
  echo "1. Invalid WABA_ID - find it in WhatsApp Manager → Settings"
  echo "2. Invalid ACCESS_TOKEN - check your .env file"
  echo "3. Invalid FLOW_ID - get it from the Flow list in Meta Business Manager"
fi
