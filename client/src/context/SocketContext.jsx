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
    const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:5000' : 'https://cyldist-lpg-platform.onrender.com';
    
    console.log('Connecting socket to:', SOCKET_URL);
    const s = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
    });

    socketRef.current = s;

    s.on('connect', () => { 
      console.log('Socket connected successfully!', s.id);
      setConnected(true); 
      setSocket(s); 
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
