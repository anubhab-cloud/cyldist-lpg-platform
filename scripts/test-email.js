'use strict';
require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: 'anubhabchoudhury163@gmail.com',
  subject: '🛢 CylDist — Your Delivery OTP',
  html: `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f1117;color:#e4e4e7;border-radius:16px;border:1px solid rgba(99,102,241,0.2)">
      <div style="text-align:center;margin-bottom:20px">
        <div style="width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#6366f1,#a855f7);display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem">🛢</div>
      </div>
      <h2 style="color:#818cf8;text-align:center;margin:0 0 8px">Delivery Verification Code</h2>
      <p style="color:#a1a1aa;text-align:center;font-size:14px;margin:0 0 24px">Your agent is on the way. Share this code to confirm delivery:</p>
      <div style="font-size:48px;font-weight:800;letter-spacing:0.4em;color:#6366f1;text-align:center;padding:20px;background:rgba(99,102,241,0.08);border-radius:12px;border:2px solid rgba(99,102,241,0.25);font-family:monospace">4827</div>
      <p style="color:#71717a;text-align:center;font-size:12px;margin:20px 0 0">Order ID: ORD-MAP-TEST-001<br>Valid for 30 minutes. Do not share with anyone else.</p>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:20px 0">
      <p style="color:#52525b;text-align:center;font-size:11px;margin:0">CylDist — Smart LPG Distribution Platform</p>
    </div>
  `,
}).then((info) => {
  console.log('✅ EMAIL SENT SUCCESSFULLY!');
  console.log('To:', 'anubhabchoudhury163@gmail.com');
  console.log('Subject: CylDist — Your Delivery OTP');
  console.log('MessageId:', info.messageId);
  console.log('\nCheck your Gmail inbox (and spam folder).');
}).catch((err) => {
  console.log('❌ FAILED:', err.message);
});
