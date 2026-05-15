import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SupportChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: `Hi ${user?.name || 'there'}! I'm CylBot 🤖. How can I assist you today?`, isBot: true },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), text: input, isBot: false };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Mock AI response
    setTimeout(() => {
      const botMsg = { id: Date.now() + 1, text: getMockResponse(userMsg.text), isBot: true };
      setMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  const getMockResponse = (text) => {
    const t = text.toLowerCase();
    if (t.includes('leak') || t.includes('smell') || t.includes('emergency')) {
      return '🚨 If you smell gas, please open all windows, do NOT use electrical switches, and evacuate the area immediately. Call our emergency line at 1-800-CYL-LEAK!';
    }
    if (t.includes('order') || t.includes('track') || t.includes('late')) {
      return 'I can help with tracking! Please provide your Order ID, or visit the "Track Order" page from your dashboard.';
    }
    if (t.includes('pay')) {
      return 'For payment issues, our billing team can assist. Would you like me to raise a high-priority ticket for you?';
    }
    return "I'm a demo bot! In a real scenario, I'd connect to our AI backend to assist you further. You can raise a formal complaint from the Support Dashboard.";
  };

  return (
    <div className="support-chat-wrapper" style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999 }}>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            width: '60px', height: '60px', borderRadius: '50%', background: 'var(--primary)', 
            color: 'white', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          💬
        </button>
      )}

      {isOpen && (
        <div style={{
          width: '350px', height: '500px', background: 'var(--bg-elevated)', borderRadius: '1rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column',
          border: '1px solid var(--border)', overflow: 'hidden', backdropFilter: 'blur(10px)'
        }}>
          {/* Header */}
          <div style={{
            padding: '1rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', background: '#00ff88', borderRadius: '50%', boxShadow: '0 0 8px #00ff88' }}></div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Support Chat</h3>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {messages.map(msg => (
              <div key={msg.id} style={{
                alignSelf: msg.isBot ? 'flex-start' : 'flex-end',
                background: msg.isBot ? 'rgba(255,255,255,0.05)' : 'var(--primary)',
                color: 'var(--text-primary)',
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                borderBottomLeftRadius: msg.isBot ? '0' : '1rem',
                borderBottomRightRadius: msg.isBot ? '1rem' : '0',
                maxWidth: '80%',
                fontSize: '0.875rem',
                lineHeight: '1.4'
              }}>
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              style={{
                flex: 1, background: 'var(--bg-dark)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '0.5rem', outline: 'none'
              }}
            />
            <button type="submit" style={{
              background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '0.5rem',
              padding: '0 1rem', cursor: 'pointer', fontWeight: 600
            }}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
