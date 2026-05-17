const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../config/logger');

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: config.notification.smtp.host || 'smtp.ethereal.email',
  port: config.notification.smtp.port || 587,
  secure: config.notification.smtp.port === 465, // true for 465, false for other ports
  auth: {
    user: config.notification.smtp.user,
    pass: config.notification.smtp.pass,
  },
});

/**
 * Send an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body
 */
const sendEmail = async (to, subject, text, html) => {
  try {
    const info = await transporter.sendMail({
      from: `"Cylinder Platform" <${config.notification.smtp.from}>`,
      to,
      subject,
      text,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}`, { error: error.message });
    throw error;
  }
};

/**
 * Send a 2FA OTP Email
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP
 */
const send2FAEmail = async (to, otp) => {
  const subject = 'Your Login Verification Code';
  const text = `Your verification code is ${otp}. It will expire in 5 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
      <h2 style="color: #6366f1; text-align: center;">Login Verification</h2>
      <p style="font-size: 16px; color: #333;">Hello,</p>
      <p style="font-size: 16px; color: #333;">Please use the following 6-digit code to complete your login. This code will expire in exactly 5 minutes.</p>
      <div style="background: #f4f3ec; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #08060d;">${otp}</span>
      </div>
      <p style="font-size: 14px; color: #666; text-align: center;">If you did not request this code, please ignore this email or change your password.</p>
    </div>
  `;
  return sendEmail(to, subject, text, html);
};

module.exports = {
  sendEmail,
  send2FAEmail,
};
