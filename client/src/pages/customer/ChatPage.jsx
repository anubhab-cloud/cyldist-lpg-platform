import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { chatAPI, ordersAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Topbar } from '../../components/Sidebar';
import { PageLoader } from '../../components';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket() || {};

  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherUser, setOtherUser]     = useState(null);
  const [typing, setTyping]     = useState(false);

  const bottomRef      = useRef(null);
  const typingTimeout  = useRef(null);
  const textareaRef    = useRef(null);

  const scrollBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Load history + fetch order to get other party's name
  useEffect(() => {
    chatAPI.getMessages(roomId, { limit: 50 })
      .then(r => setMessages(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));

    chatAPI.markRead(roomId).catch(() => {});

    // Optionally fetch order info to display the other party's name
    ordersAPI.getById(roomId)
      .then(r => {
        const order = r.data.data;
        if (user.role === 'customer') {
          setOtherUser({ name: order.agentId?.name || 'Delivery Agent', role: 'agent' });
        } else {
          setOtherUser({ name: order.customerId?.name || 'Customer', role: 'customer' });
        }
      })
      .catch(() => {});
  }, [roomId, user.role]);

  useEffect(() => { scrollBottom(); }, [messages]);

  // Socket
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      console.log('[Socket] Emitting chat:join for room:', roomId);
      socket.emit('chat:join', { chatRoomId: roomId });
    };

    // Join room immediately if already connected
    if (socket.connected) {
      joinRoom();
    }

    // Join room upon connection / reconnection events
    socket.on('connect', joinRoom);

    socket.on('chat:history', ({ messages: hist }) => setMessages(hist || []));
    socket.on('chat:message',  (msg) => setMessages(prev => [...prev, msg]));
    socket.on('chat:typing',   ({ userId }) => { if (userId !== user.id) setOtherTyping(true); });
    socket.on('chat:stop_typing', ({ userId }) => { if (userId !== user.id) setOtherTyping(false); });
    socket.on('chat:read_receipt', () => {});
    
    return () => {
      socket.emit('chat:leave', { chatRoomId: roomId });
      socket.off('connect', joinRoom);
      ['chat:history','chat:message','chat:typing','chat:stop_typing','chat:read_receipt']
        .forEach(ev => socket.off(ev));
    };
  }, [socket, roomId, user?.id]);

  const sendMessage = useCallback(async () => {
    if (!input.trim()) return;
    const content = input.trim();
    setInput('');
    clearTimeout(typingTimeout.current);
    setTyping(false);
    textareaRef.current?.focus();

    try {
      if (socket && connected) {
        socket.emit('chat:stop_typing', { chatRoomId: roomId });
      }
      const res = await chatAPI.sendMessage(roomId, content);
      
      // If socket is disconnected, append the message locally so the sender sees it immediately
      if (!connected) {
        const newMsg = res.data?.data;
        if (newMsg) {
          setMessages(prev => {
            if (prev.some(m => m._id === newMsg._id || m.messageId === newMsg.messageId)) return prev;
            return [...prev, newMsg];
          });
        }
      }
    } catch (err) {
      console.error('[Chat] Failed to send message:', err);
      setInput(content);
      alert(err.response?.data?.message || 'Failed to send message. Please try again.');
    }
  }, [input, socket, connected, roomId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (!socket) return;
    if (!typing) {
      setTyping(true);
      socket.emit('chat:typing', { chatRoomId: roomId });
    }
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      setTyping(false);
      socket?.emit('chat:stop_typing', { chatRoomId: roomId });
    }, 2000);
  };

  if (loading) return <PageLoader />;

  const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.createdAt).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }}>
      
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '0.875rem 1.5rem',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.25rem', padding: '0.25rem', lineHeight: 1 }}>←</button>
        
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: user.role === 'customer'
            ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
            : 'linear-gradient(135deg, #f59e0b, #f97316)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {user.role === 'customer' ? '🚴' : '👤'}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
            {otherUser?.name || (user.role === 'customer' ? 'Delivery Agent' : 'Customer')}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#10b981' : '#ef4444',
              display: 'inline-block',
              boxShadow: connected ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(239,68,68,0.5)',
              transition: 'all 0.3s'
            }}></span>
            {connected ? 'Live' : 'Connecting...'} · Order: <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{roomId?.split('-')[0]?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem',
        display: 'flex', flexDirection: 'column', gap: '0.25rem',
      }}>
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}
          >
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💬</div>
            <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Start the conversation</div>
            <div style={{ fontSize: '0.85rem' }}>Your messages are end-to-end private between you and {user.role === 'customer' ? 'your delivery agent' : 'the customer'}.</div>
          </motion.div>
        )}

        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            {/* Date separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1rem 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{date}</div>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {msgs.map((msg, i) => {
              const isOwn = msg.senderId === user.id || msg.senderId?._id === user.id;
              return (
                <motion.div
                  key={msg._id || i}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start',
                    alignItems: 'flex-end',
                    gap: '0.5rem',
                    marginBottom: '0.5rem',
                  }}
                >
                  {/* Avatar for other user */}
                  {!isOwn && (
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                    }}>
                      {(msg.senderRole?.[0] || '?').toUpperCase()}
                    </div>
                  )}

                  <div style={{ maxWidth: '68%' }}>
                    <div style={{
                      padding: '0.6rem 0.9rem',
                      borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      background: isOwn
                        ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                        : 'var(--bg-surface)',
                      color: isOwn ? '#fff' : 'var(--text-primary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.5,
                      border: isOwn ? 'none' : '1px solid var(--border)',
                      boxShadow: isOwn ? '0 4px 12px rgba(99,102,241,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                    <div style={{
                      fontSize: '0.65rem', color: 'var(--text-muted)',
                      marginTop: '0.25rem', textAlign: isOwn ? 'right' : 'left',
                    }}>
                      {formatTime(msg.createdAt)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ))}

        {/* Typing indicator */}
        <AnimatePresence>
          {otherTyping && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}
            >
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem' }}>✏️</div>
              <div style={{ padding: '0.5rem 0.875rem', borderRadius: 18, background: 'var(--bg-surface)', border: '1px solid var(--border)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                {[0, 0.15, 0.3].map((delay, i) => (
                  <motion.div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)' }}
                    animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.8, delay }} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div style={{
        padding: '0.875rem 1.25rem',
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: '0.75rem', alignItems: 'flex-end',
        flexShrink: 0,
      }}>
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Type a message... (Enter to send)"
          value={input}
          onChange={handleTyping}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1, padding: '0.7rem 1rem', borderRadius: 24,
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            color: 'var(--text-primary)', fontSize: '0.9rem', resize: 'none',
            outline: 'none', maxHeight: 120, overflowY: 'auto', lineHeight: 1.5,
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed',
            background: input.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'var(--bg-elevated)',
            color: input.trim() ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', flexShrink: 0, transition: 'all 0.2s',
            boxShadow: input.trim() ? '0 4px 12px rgba(99,102,241,0.4)' : 'none',
          }}
        >↑</button>
      </div>
    </div>
  );
}
