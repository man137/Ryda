// app/hooks/useStableWebSocket.ts

import { useState, useRef, useCallback, useEffect } from 'react';
import { ConnectionStatus } from '../types';
import { WS_CONFIG } from '../constants';

export const useStableWebSocket = (
  clientId: string,
  onMessage: (data: any) => void,
  shouldConnect: boolean
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const missedHeartbeatsRef = useRef(0);
  const reconnectAttemptsRef = useRef(0);
  const isIntentionalCloseRef = useRef(false);
  const messageQueueRef = useRef<any[]>([]);
  const lastActivityRef = useRef(Date.now());

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');

  // --- Cleanup intervals and timeouts ---
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // --- Send message safely ---
  const sendMessage = useCallback(
    (message: any) => {
      const messageStr = JSON.stringify(message);

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(messageStr);
          console.log('📤 Sent:', message.type);
          lastActivityRef.current = Date.now();
        } catch (error) {
          console.error('Send error:', error);
          messageQueueRef.current.push(message);
        }
      } else {
        console.log('⏳ Queuing message:', message.type);
        messageQueueRef.current.push(message);

        if (shouldConnect && wsRef.current?.readyState !== WebSocket.CONNECTING) {
          connect();
        }
      }
    },
    [shouldConnect]
  );

  // --- Connect WebSocket ---
  const connect = useCallback(() => {
    if (!shouldConnect || !clientId) {
      console.log('❌ Not connecting: shouldConnect=', shouldConnect, 'clientId=', clientId);
      return;
    }

    if (
      wsRef.current &&
      (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)
    ) {
      console.log('⚠️ Already connecting/connected');
      return;
    }

    cleanup();
    setConnectionStatus('connecting');
    console.log('🔌 Connecting WebSocket...');

    try {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002';
      console.log('🌐 Connecting to WebSocket at', `${wsUrl}/?type=client&id=${clientId}`);

      const ws = new WebSocket(`${wsUrl}/?type=client&id=${clientId}`);
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.log('⏱️ Connection timeout');
          ws.close();
        }
      }, WS_CONFIG.CONNECTION_TIMEOUT);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ WebSocket connected');
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        missedHeartbeatsRef.current = 0;
        lastActivityRef.current = Date.now();

        // Flush queued messages
        setTimeout(() => {
          const queue = [...messageQueueRef.current];
          messageQueueRef.current = [];
          queue.forEach(msg => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(msg));
              console.log('📤 Flushed queued message:', msg.type);
            }
          });
        }, 100);

        // Heartbeat interval
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const timeSinceActivity = Date.now() - lastActivityRef.current;

            if (timeSinceActivity > WS_CONFIG.HEARTBEAT_INTERVAL * 3) {
              missedHeartbeatsRef.current++;
              console.warn(`⚠️ Missed heartbeats: ${missedHeartbeatsRef.current}`);

              if (missedHeartbeatsRef.current >= 3) {
                console.error('💀 Too many missed heartbeats, reconnecting...');
                ws.close();
                return;
              }
            }

            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, WS_CONFIG.HEARTBEAT_INTERVAL);
      };

      ws.onmessage = (event) => {
        lastActivityRef.current = Date.now();
        missedHeartbeatsRef.current = 0;

        try {
          const data = JSON.parse(event.data);

          if (data.type === 'pong') {
            console.log('💓 Heartbeat');
            return;
          }

          console.log('📨 Received:', data.type);
          onMessage(data);
        } catch (error) {
          console.error('Message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        console.log(`🔌 WebSocket closed: ${event.code} - ${event.reason}`);
        cleanup();

        if (isIntentionalCloseRef.current || !shouldConnect) {
          setConnectionStatus('disconnected');
          return;
        }

        setConnectionStatus('disconnected');

        if (reconnectAttemptsRef.current < WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(
            WS_CONFIG.BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current),
            WS_CONFIG.MAX_RECONNECT_DELAY
          );

          console.log(
            `🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${
              WS_CONFIG.MAX_RECONNECT_ATTEMPTS
            })`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          console.error('❌ Max reconnect attempts reached');
          setConnectionStatus('error');
        }
      };
    } catch (error) {
      console.error('Connection error:', error);
      setConnectionStatus('error');
    }
  }, [shouldConnect, clientId, onMessage, cleanup, sendMessage]);

  // --- Disconnect WebSocket ---
  const disconnect = useCallback(() => {
    console.log('🛑 Disconnecting...');
    isIntentionalCloseRef.current = true;
    cleanup();
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, [cleanup]);

  // --- Handle tab visibility ---
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Tab visible - checking connection');
        if (shouldConnect) {
          const wsState = wsRef.current?.readyState;
          if (wsState !== WebSocket.OPEN && wsState !== WebSocket.CONNECTING) {
            reconnectAttemptsRef.current = 0;
            setTimeout(connect, WS_CONFIG.VISIBILITY_RECONNECT_DELAY);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [shouldConnect, connect]);

  // --- Initial connect / cleanup ---
  useEffect(() => {
    isIntentionalCloseRef.current = false;

    if (shouldConnect && clientId) connect();
    else if (!shouldConnect) disconnect();

    return () => {
      isIntentionalCloseRef.current = true;
      cleanup();
      wsRef.current?.close(1000, 'Component cleanup');
    };
  }, [shouldConnect, clientId, connect, disconnect, cleanup]);

  return { connectionStatus, sendMessage, disconnect };
};
