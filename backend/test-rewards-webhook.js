import 'dotenv/config';

const WEBHOOK_URL = 'http://localhost:3001/webhook/whatsapp';
const phoneNumber = '+447404938935';

const webhookPayload = {
  entry: [
    {
      id: '123456789',
      changes: [
        {
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: '1234567890',
              phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID
            },
            messages: [
              {
                from: phoneNumber,
                id: 'wamid.test123',
                timestamp: Math.floor(Date.now() / 1000).toString(),
                type: 'text',
                text: {
                  body: 'rewards'
                }
              }
            ]
          },
          field: 'messages'
        }
      ]
    }
  ]
};

console.log('Sending REWARDS webhook to:', WEBHOOK_URL);
console.log('From phone:', phoneNumber);
console.log('Payload:', JSON.stringify(webhookPayload, null, 2));

try {
  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': 'sha256=' // Webhook signature (can be empty for local testing)
    },
    body: JSON.stringify(webhookPayload)
  });

  const data = await response.text();

  console.log('\n✅ Webhook sent!');
  console.log('Status:', response.status);
  console.log('Response:', data);
} catch (error) {
  console.error('\n❌ Error:', error.message);
}
