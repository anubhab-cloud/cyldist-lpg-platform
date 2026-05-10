import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { chatAPI } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { Topbar } from '../../components/Sidebar';
import { PageLoader } from '../../components';

export default function ChatPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket() || {};
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);

  const scrollBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Load history
  useEffect(() => {
    chatAPI.getMessages(roomId, { limit: 50 })
      .then(r => setMessages(r.data.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
    chatAPI.markRead(roomId).catch(() => {});
  }, [roomId]);

  useEffect(() => { scrollBottom(); }, [messages]);

  // Socket events
  useEffect(() => {
    if (!socket) return;
    socket.emit('chat:join', { chatRoomId: roomId });
    socket.on('chat:history', ({ messages: hist }) => setMessages(hist || []));
    socket.on('chat:message', (msg) => setMessages(prev => [...prev, msg]));
    socket.on('chat:typing', ({ userId }) => { if (userId !== user.id) setOtherTyping(true); });
    socket.on('chat:stop_typing', ({ userId }) => { if (userId !== user.id) setOtherTyping(false); });
    socket.on('chat:read_receipt', () => {});
    return () => {
      socket.emit('chat:leave', { chatRoomId: roomId });
      socket.off('chat:history');
      socket.off('chat:message');
      socket.off('chat:typing');
      socket.off('chat:stop_typing');
      socket.off('chat:read_receipt');
    };
  }, [socket, roomId, user?.id]);

  const sendMessage = useCallback(() => {
    if (!input.trim() || !socket) return;
    socket.emit('chat:send', { chatRoomId: roomId, content: input.trim() });
    setInput('');
    socket.emit('chat:stop_typing', { chatRoomId: roomId });
    clearTimeout(typingTimeout.current);
  }, [input, socket, roomId]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Topbar title="💬 Order Chat">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{roomId}</span>
      </Topbar>

      <div className="chat-container" style={{ margin: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', margin: 'auto' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👋</div>
              <p>Start the conversation!</p>
            </div>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.senderId === user.id || msg.senderId?._id === user.id;
            return (
              <div key={msg._id || i} className={`msg ${isOwn ? 'own' : 'other'}`}>
                {!isOwn && (
                  <div className="avatar" style={{ width: 30, height: 30, fontSize: '0.7rem', flexShrink: 0 }}>
                    {msg.senderRole?.[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <div className="msg-bubble">{msg.content}</div>
                  <div className="msg-meta">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="typing-indicator">{otherTyping ? '✏️ Agent is typing...' : ''}</div>

        <div className="chat-input-bar">
          <textarea
            rows={1} placeholder="Type a message..."
            value={input} onChange={handleTyping} onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={sendMessage} disabled={!input.trim()}>Send ↑</button>
        </div>
      </div>
    </div>
  );
}
