import 'dotenv/config';
import { sendWaitlistConfirmation } from './src/services/email.service.js';

const testEmail = process.argv[2] || 'darlynton03@gmail.com';

console.log(`\n🧪 Testing email send to: ${testEmail}\n`);

sendWaitlistConfirmation(testEmail)
  .then(result => {
    console.log('\n📊 Result:', JSON.stringify(result, null, 2));
    if (result.success) {
      console.log('\n✅ Email sent successfully!');
      console.log('📧 Check your inbox (and spam folder)');
    } else {
      console.log('\n❌ Email failed to send');
      console.error('Error:', result.error || result.message);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n💥 Unexpected error:', err);
    process.exit(1);
  });
