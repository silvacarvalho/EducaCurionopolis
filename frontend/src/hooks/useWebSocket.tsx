/**
 * useWebSocket Hook
 * Real-time WebSocket connection for notifications
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { getWebSocketUrl } from '../services/api';
import { WebSocketMessage } from '../types';

interface UseWebSocketOptions {
  userId: number | null;
  token: string | null;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  onlineUsers: number[];
  sendMessage: (message: string) => void;
  reconnect: () => void;
}

export const useWebSocket = ({
  userId,
  token,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketOptions): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<number[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;
  
  // Store callbacks in refs to avoid reconnection on callback changes
  const onMessageRef = useRef(onMessage);
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
  }, [onMessage, onConnect, onDisconnect, onError]);

  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!userId || !token) {
      console.log('[WebSocket] Cannot connect - missing userId or token', { userId, hasToken: !!token });
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const url = getWebSocketUrl(userId, token);
      console.log('[WebSocket] Connecting to:', url.replace(/token=.*/, 'token=***'));
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        onConnectRef.current?.();

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);

        // Request online users
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('get_online_users');
          }
        }, 1000);
      };

      ws.onmessage = (event) => {
        try {
          // Handle pong response
          if (event.data === 'pong') {
            return;
          }

          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message.type);
          
          // Handle online users update
          if (message.type === 'online_users') {
            const users = message.data?.users || [];
            console.log('[WebSocket] Online users:', users);
            setOnlineUsers(users);
          }

          onMessageRef.current?.(message);
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error, event.data);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        setIsConnected(false);
        clearTimers();
        onDisconnectRef.current?.();

        // Attempt to reconnect if not a normal close
        if (event.code !== 1000 && event.code !== 4001) {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            console.log(`[WebSocket] Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            reconnectTimeoutRef.current = setTimeout(connect, reconnectDelay);
          } else {
            console.log('[WebSocket] Max reconnect attempts reached');
          }
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        onErrorRef.current?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', error);
    }
  }, [userId, token, clearTimers]);

  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
    setOnlineUsers([]);
  }, [clearTimers]);

  const sendMessage = useCallback((message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    setTimeout(connect, 100);
  }, [disconnect, connect]);

  useEffect(() => {
    console.log('[WebSocket] useEffect triggered - userId:', userId, 'hasToken:', !!token);
    if (userId && token) {
      connect();
    }
    return () => {
      disconnect();
    };
  }, [userId, token, connect, disconnect]);

  return {
    isConnected,
    onlineUsers,
    sendMessage,
    reconnect,
  };
};

export default useWebSocket;