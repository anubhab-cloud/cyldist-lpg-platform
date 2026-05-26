import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user, updateUser } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    
    // Always connect to the same host the frontend is running on.
    // In dev (Vite), /socket.io is proxied to :5000 via vite.config.js
    // In production build served by Express, it connects directly.
    const SOCKET_URL = window.location.origin;
    
    console.log('[Socket] Connecting to:', SOCKET_URL);
    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socketRef.current = s;
    setSocket(s); // Set immediately so components can attach listeners before connect

    s.on('connect', () => { 
      console.log('[Socket] Connected:', s.id);
      setConnected(true); 
    });
    s.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
    s.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });
    s.on('error', (err) => console.error('Socket error:', err));
    
    // Real-time user profile updates (e.g., KYC status changes from admin)
    s.on('user:updated', (updatedUser) => {
      updateUser(updatedUser);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
