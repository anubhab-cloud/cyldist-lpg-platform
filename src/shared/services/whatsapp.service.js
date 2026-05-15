'use strict';

const axios = require('axios');
const logger = require('../../config/logger');

class WhatsAppService {
  constructor() {
    this.token = process.env.WHATSAPP_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.apiUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
    this.isConfigured = Boolean(this.token && this.phoneNumberId);
  }

  /**
   * Format phone number to E.164 standard required by WhatsApp
   * @param {string} phone
   * @returns {string}
   */
  _formatPhoneNumber(phone) {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    // If it's a 10 digit Indian number, prepend 91
    if (cleaned.length === 10) {
      cleaned = `91${cleaned}`;
    }
    return cleaned;
  }

  /**
   * Send a template message
   * @param {string} to - Destination phone number
   * @param {string} templateName - Name of the approved template
   * @param {string} languageCode - Language code (e.g., 'en_US')
   * @param {Array} components - Template components (header, body parameters)
   * @returns {Promise<boolean>}
   */
  async sendTemplateMessage(to, templateName, languageCode = 'en_US', components = []) {
    if (!this.isConfigured) {
      logger.info(`[WhatsApp Stub] Template '${templateName}' to ${to}`, { components });
      return true;
    }

    const formattedPhone = this._formatPhoneNumber(to);
    if (!formattedPhone) return false;

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: templateName,
            language: {
              code: languageCode,
            },
            components,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      logger.info(`WhatsApp template '${templateName}' sent to ${formattedPhone}`);
      return true;
    } catch (error) {
      logger.error('WhatsApp API Error:', {
        message: error.message,
        response: error.response?.data,
      });
      return false;
    }
  }

  /**
   * Send a free-form text message (requires active 24h user-initiated conversation window)
   * @param {string} to 
   * @param {string} text 
   * @returns {Promise<boolean>}
   */
  async sendTextMessage(to, text) {
    if (!this.isConfigured) {
      logger.info(`[WhatsApp Stub] Text to ${to}: ${text}`);
      return true;
    }

    const formattedPhone = this._formatPhoneNumber(to);
    if (!formattedPhone) return false;

    try {
      await axios.post(
        this.apiUrl,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: text,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      logger.info(`WhatsApp text sent to ${formattedPhone}`);
      return true;
    } catch (error) {
      logger.error('WhatsApp API Error:', {
        message: error.message,
        response: error.response?.data,
      });
      return false;
    }
  }
}

module.exports = new WhatsAppService();
