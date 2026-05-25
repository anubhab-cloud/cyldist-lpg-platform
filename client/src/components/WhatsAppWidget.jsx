import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import './WhatsAppWidget.css'; // We will create this CSS file

export function WhatsAppWidget({ phoneNumber = "918732011084", message = "Hello, I want to book a gas cylinder." }) {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

  return (
    <motion.div
      className="whatsapp-widget-container"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 1 }}
    >
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-widget-btn"
        title="Chat with us on WhatsApp"
      >
        <span className="whatsapp-widget-tooltip">Need Help? Chat with us!</span>
        <div className="whatsapp-widget-icon-wrapper">
          <MessageCircle size={28} color="#ffffff" className="whatsapp-widget-icon" fill="currentColor" />
        </div>
      </a>
    </motion.div>
  );
}
