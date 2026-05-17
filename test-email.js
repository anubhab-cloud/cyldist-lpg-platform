'use strict';
require('dotenv').config();
const emailService = require('./src/utils/email');

async function testEmail() {
  console.log('Testing SMTP connection...');
  console.log(`Using SMTP Host: ${process.env.SMTP_HOST || 'Not Set'}`);
  console.log(`Using SMTP User: ${process.env.SMTP_USER || 'Not Set'}`);
  
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ Error: SMTP_USER or SMTP_PASS is missing from .env file!');
    process.exit(1);
  }

  try {
    const info = await emailService.send2FAEmail(process.env.SMTP_USER, '123456');
    console.log('✅ Success! Test email sent successfully.');
    console.log(`Message ID: ${info.messageId}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    process.exit(1);
  }
}

testEmail();
