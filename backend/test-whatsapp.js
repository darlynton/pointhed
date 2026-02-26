import 'dotenv/config';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0';
const WHATSAPP_API_TOKEN = process.env.WHATSAPP_API_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

console.log('Testing WhatsApp API...');
console.log('API Token:', WHATSAPP_API_TOKEN ? `${WHATSAPP_API_TOKEN.substring(0, 20)}...` : 'NOT SET');
console.log('Phone Number ID:', WHATSAPP_PHONE_NUMBER_ID || 'NOT SET');

const phoneNumber = '+447404938935';
const message = '🎉 Test message from LoyalQ!';

console.log('\nSending test message to:', phoneNumber);

try {
  const response = await fetch(
    `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: {
          body: message
        }
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error('\n❌ WhatsApp API Error:');
    console.error('Status:', response.status);
    console.error('Error:', JSON.stringify(data, null, 2));
  } else {
    console.log('\n✅ Message sent successfully!');
    console.log('Message ID:', data.messages?.[0]?.id);
    console.log('Response:', JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error('\n❌ Error:', error.message);
}
