/**
 * Messages Context
 * Global state for messaging system with real-time updates
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { mensagensAPI } from '../services/api';
import { useAuth } from './AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useNotification } from './NotificationContext';
import { Mensagem, WebSocketMessage, ContadorMensagens } from '../types';

interface MessagesContextData {
  unreadCount: number;
  inbox: Mensagem[];
  sent: Mensagem[];
  isConnected: boolean;
  onlineUsers: number[];
  isLoading: boolean;
  refreshInbox: () => Promise<void>;
  refreshSent: () => Promise<void>;
  refreshContador: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  reconnectWebSocket: () => void;
}

const MessagesContext = createContext<MessagesContextData>({} as MessagesContextData);

interface MessagesProviderProps {
  children: ReactNode;
}

export const MessagesProvider: React.FC<MessagesProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const [unreadCount, setUnreadCount] = useState(0);
  const [inbox, setInbox] = useState<Mensagem[]>([]);
  const [sent, setSent] = useState<Mensagem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  // Use refs for functions that need to be called in WebSocket handler
  const refreshInboxRef = useRef<() => Promise<void>>();
  const showNotificationRef = useRef(showNotification);
  
  // Keep notification ref updated
  useEffect(() => {
    showNotificationRef.current = showNotification;
  }, [showNotification]);

  // Get token when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const storedToken = localStorage.getItem('access_token');
      console.log('[MessagesProvider] Token available:', !!storedToken);
      setToken(storedToken);
    } else {
      setToken(null);
    }
  }, [isAuthenticated]);

  const refreshContador = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const response = await mensagensAPI.getContador();
      const data: ContadorMensagens = response.data;
      setUnreadCount(data.nao_lidas);
    } catch (error) {
      console.error('Error fetching message count:', error);
    }
  }, [isAuthenticated]);

  const refreshInbox = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await mensagensAPI.getInbox();
      setInbox(response.data);
    } catch (error) {
      console.error('Error fetching inbox:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const refreshSent = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await mensagensAPI.getSent();
      setSent(response.data);
    } catch (error) {
      console.error('Error fetching sent messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Keep ref updated
  useEffect(() => {
    refreshInboxRef.current = refreshInbox;
  }, [refreshInbox]);

  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('[WebSocket] Received message:', message.type, message.data);
    switch (message.type) {
      case 'new_message':
        // Update unread count and refresh inbox
        setUnreadCount((prev) => prev + 1);
        // Use ref to get current function
        if (refreshInboxRef.current) {
          refreshInboxRef.current();
        }
        // Show notification
        const data = message.data;
        if (data && showNotificationRef.current) {
          const notifMessage = data.remetente_nome 
            ? `Nova mensagem de ${data.remetente_nome}: ${data.assunto || 'Sem assunto'}`
            : 'Você recebeu uma nova mensagem';
          showNotificationRef.current(notifMessage, 'info');
        }
        break;
      case 'message_read':
        // Could update UI to show message was read
        break;
      case 'unread_count':
        setUnreadCount(message.data.count);
        break;
      default:
        break;
    }
  }, []);

  const { isConnected, onlineUsers, reconnect } = useWebSocket({
    userId: user?.id || null,
    token: token,
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('[WebSocket] Messages connected');
      // Refresh data when connected
      if (refreshInboxRef.current) {
        refreshInboxRef.current();
      }
    },
    onDisconnect: () => {
      console.log('[WebSocket] Messages disconnected');
    },
  });

  const reconnectWebSocket = useCallback(() => {
    console.log('[MessagesProvider] Manual reconnect requested');
    reconnect();
  }, [reconnect]);

  const markAsRead = useCallback(async (id: number) => {
    try {
      await mensagensAPI.markAsRead(id);
      setInbox((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, lida: true } : msg))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await mensagensAPI.markAllAsRead();
      setInbox((prev) => prev.map((msg) => ({ ...msg, lida: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all messages as read:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshContador();
      refreshInbox();
    }
  }, [isAuthenticated, user, refreshContador, refreshInbox]);

  // Periodic refresh of contador (every 60 seconds as backup)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      refreshContador();
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshContador]);

  return (
    <MessagesContext.Provider
      value={{
        unreadCount,
        inbox,
        sent,
        isConnected,
        onlineUsers,
        isLoading,
        refreshInbox,
        refreshSent,
        refreshContador,
        markAsRead,
        markAllAsRead,
        reconnectWebSocket,
      }}
    >
      {children}
    </MessagesContext.Provider>
  );
};

export const useMessages = (): MessagesContextData => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
};

export default MessagesContext;