import { useRef, useCallback, useState } from "react";
import type { WebSocketMessage, GameState, ChatMessage } from "@shared/schema";

interface WebSocketHooks {
  onGameState: (gameState: GameState) => void;
  onPlayerJoined: (data: { playerName: string; playerId: string }) => void;
  onPlayerLeft: (data: { playerId: string }) => void;
  onError: (error: { message: string }) => void;
  onChatMessage?: (message: ChatMessage) => void;
}

export function useWebSocket(hooks: WebSocketHooks) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const messageQueue = useRef<(Omit<WebSocketMessage, 'type'> & { type: string })[]>([]);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 8;
  const reconnectDelay = useRef(1000);
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);

  const startHeartbeat = () => {
    heartbeatInterval.current = setInterval(() => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        // 작은 메시지로 연결 상태만 확인 (더 가벼움)
        ws.current.send(JSON.stringify({ type: 'ping', data: null }));
      }
    }, 18000); // 18초마다 연결 유지 (서버 20초보다 짧게)
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
  };

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    // Close existing connection if it exists
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }

    return new Promise<void>((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log(`Connecting to WebSocket: ${wsUrl}`);
      ws.current = new WebSocket(wsUrl);
      
      ws.current.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected successfully');
        
        reconnectAttempts.current = 0;
        reconnectDelay.current = 1000;
        setIsReconnecting(false);
        startHeartbeat();
        
        // Send queued messages
        console.log(`Sending ${messageQueue.current.length} queued messages`);
        while (messageQueue.current.length > 0) {
          const queuedMessage = messageQueue.current.shift();
          if (queuedMessage && ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(queuedMessage));
          }
        }
        
        resolve();
      };
      
      ws.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'gameState':
              hooks.onGameState(message.data);
              break;
            case 'playerJoined':
              hooks.onPlayerJoined(message.data);
              break;
            case 'playerLeft':
              hooks.onPlayerLeft(message.data);
              break;
            case 'error':
              hooks.onError(message.data);
              break;
            case 'chatMessage':
              if (hooks.onChatMessage) {
                hooks.onChatMessage(message.data);
              }
              break;
            case 'pong':
              // Server responded to ping, connection is healthy
              console.log('Received pong from server');
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.current.onclose = (event) => {
        setIsConnected(false);
        stopHeartbeat();
        console.log(`WebSocket disconnected. Code: ${event.code}, Reason: ${event.reason}`);
        
        // 연결 끊김 시 즉시 알림 (재연결 시도 최소화)
        if (event.code !== 1000) {
          console.warn('Unexpected disconnection detected');
          hooks.onError({ message: '연결이 끊어졌습니다. 페이지를 새로고침해주세요.' });
        }
      };
      
      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        hooks.onError({ message: 'Connection error' });
        reject(error);
      };

      setTimeout(() => {
        if (ws.current?.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket connection timeout'));
        }
      }, 5000);
    });
  }, [hooks]);

  const disconnect = useCallback(() => {
    stopHeartbeat();
    if (ws.current) {
      ws.current.close();
      ws.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((message: Omit<WebSocketMessage, 'type'> & { type: string }) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      messageQueue.current.push(message);
      console.log('Message queued, WebSocket not ready. Will retry when connected.');
      
      // Attempt reconnection if not already connecting
      if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
        connect().catch(console.error);
      }
    }
  }, [connect]);

  const joinGame = useCallback((roomCode: string, playerName: string, playerId: string) => {
    sendMessage({
      type: 'joinGame',
      data: { roomCode, playerName, playerId }
    });
  }, [sendMessage]);

  const sendPlayerAction = useCallback((roomCode: string, playerId: string, action: any) => {
    sendMessage({
      type: 'playerAction',
      data: { roomCode, playerId, action }
    });
  }, [sendMessage]);

  const leaveGame = useCallback((roomCode: string, playerId: string) => {
    sendMessage({
      type: 'leaveGame',
      data: { roomCode, playerId }
    });
  }, [sendMessage]);

  const startGame = useCallback((roomCode: string) => {
    sendMessage({
      type: 'startGame',
      data: { roomCode }
    });
  }, [sendMessage]);

  const confirmWinner = useCallback((roomCode: string, playerId: string) => {
    sendMessage({
      type: 'confirmWinner',
      data: { roomCode, playerId }
    });
  }, [sendMessage]);

  const updateSettings = useCallback((roomCode: string, playerId: string, settings: { startingChips: number; smallBlind: number; bigBlind: number }) => {
    sendMessage({
      type: 'updateSettings',
      data: { roomCode, playerId, settings }
    });
  }, [sendMessage]);

  const increaseBlind = useCallback((roomCode: string, playerId: string, newBigBlind?: number) => {
    sendMessage({
      type: 'increaseBlind',
      data: { roomCode, playerId, newBigBlind }
    });
  }, [sendMessage]);

  const startNextHand = useCallback((roomCode: string, playerId: string) => {
    sendMessage({
      type: 'startNextHand',
      data: { roomCode, playerId }
    });
  }, [sendMessage]);

  const resetToSettings = useCallback((roomCode: string, playerId: string) => {
    sendMessage({
      type: 'resetToSettings',
      data: { roomCode, playerId }
    });
  }, [sendMessage]);

  const sendChatMessage = useCallback((roomCode: string, playerId: string, playerName: string, message: string) => {
    sendMessage({
      type: 'sendMessage',
      data: { roomCode, playerId, playerName, message }
    });
  }, [sendMessage]);

  const reconnectToGame = useCallback((roomCode: string, playerId: string) => {
    sendMessage({
      type: 'reconnect',
      data: { roomCode, playerId }
    });
  }, [sendMessage]);

  return {
    isConnected,
    isReconnecting,
    connect,
    disconnect,
    joinGame,
    sendPlayerAction,
    leaveGame,
    startGame,
    confirmWinner,
    updateSettings,
    increaseBlind,
    startNextHand,
    resetToSettings,
    sendChatMessage,
    reconnectToGame
  };
}
