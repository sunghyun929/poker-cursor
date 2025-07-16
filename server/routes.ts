import { Express } from "express";
import { createServer, Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { GameManager } from "./game/GameManager";
import { insertPokerGameSchema, WebSocketMessage, GameState } from "@shared/schema";
import { z } from "zod";

const gameManager = new GameManager(storage);

export async function registerRoutes(app) {
  app.get("/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Create poker game room
  app.post("/api/games", async (req, res) => {
    try {
      const gameData = insertPokerGameSchema.parse(req.body);
      const game = await storage.createPokerGame(gameData);
      await gameManager.createGame(game.roomCode, {
        maxPlayers: game.maxPlayers,
        smallBlind: game.smallBlind,
        bigBlind: game.bigBlind
      });
      res.json(game);
    } catch (error) {
      console.error("Error creating game:", error);
      res.status(400).json({ error: "Failed to create game" });
    }
  });

  // Get game by room code
  app.get("/api/games/:roomCode", async (req, res) => {
    try {
      const { roomCode } = req.params;
      const game = await storage.getPokerGameByRoomCode(roomCode);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      const gameState = await storage.getGameState(roomCode);
      res.json({ game, gameState });
    } catch (error) {
      console.error("Error fetching game:", error);
      res.status(500).json({ error: "Failed to fetch game" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server optimized for Render's persistent connections
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    // Render 최적화 설정
    perMessageDeflate: false,     // 압축 비활성화로 CPU 절약
    maxPayload: 512 * 1024,       // 512KB로 제한하여 메모리 절약
    clientTracking: true,
    skipUTF8Validation: true,     // UTF8 검증 건너뛰어 성능 향상
    backlog: 511                  // 연결 대기열 크기
  });

  // Track active connections per room for better management
  const roomConnections = new Map<string, Set<WebSocket>>();
  
  // Set up game state change callback for automatic broadcasting
  gameManager.onGameStateChange = (roomCode: string, gameState: GameState) => {
    broadcastToRoom(roomCode, {
      type: 'gameState',
      data: gameState
    });
  };

  // Heartbeat system to detect and handle dead connections
  const heartbeat = function(this: WebSocket) {
    (this as any).isAlive = true;
  };

  // Render 환경에 맞춘 연결 유지 시스템 (더 짧은 간격으로 체크)
  const interval = setInterval(() => {
    wss.clients.forEach((ws: WebSocket) => {
      if ((ws as any).isAlive === false) {
        console.log('Terminating dead connection');
        return ws.terminate();
      }
      
      (ws as any).isAlive = false;
      // Native WebSocket ping 사용 (더 효율적)
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping('heartbeat');
      }
    });
  }, 20000); // 20초마다 체크하여 연결 유지

  wss.on('close', () => {
    clearInterval(interval);
  });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('Client connected to WebSocket');
    
    // Initialize connection health
    (ws as any).isAlive = true;
    (ws as any).roomCode = null;
    (ws as any).playerId = null;

    // Set up heartbeat
    ws.on('pong', heartbeat);

    // Handle connection close
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      const roomCode = (ws as any).roomCode;
      if (roomCode && roomConnections.has(roomCode)) {
        roomConnections.get(roomCode)?.delete(ws);
        if (roomConnections.get(roomCode)?.size === 0) {
          roomConnections.delete(roomCode);
        }
      }
    });

    // Handle connection errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    ws.on('message', async (data) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        
        // Handle ping separately to avoid type issues
        if ((message as any).type === 'ping') {
          sendMessage(ws, { type: 'pong', data: null });
          return;
        }

        switch (message.type) {
          case 'joinGame':
            await handleJoinGame(ws, message.data);
            break;
          case 'playerAction':
            await handlePlayerAction(ws, message.data);
            break;
          case 'leaveGame':
            await handleLeaveGame(ws, message.data);
            break;
          case 'startGame':
            await handleStartGame(ws, message.data);
            break;
          case 'confirmWinner':
            await handleConfirmWinner(ws, message.data);
            break;
          case 'updateSettings':
            await handleUpdateSettings(ws, message.data);
            break;
          case 'increaseBlind':
            await handleIncreaseBlind(ws, message.data);
            break;
          case 'startNextHand':
            await handleStartNextHand(ws, message.data);
            break;
          case 'resetToSettings':
            await handleResetToSettings(ws, message.data);
            break;
          case 'sendMessage':
            await handleSendMessage(ws, message.data);
            break;
          case 'reconnect':
            await handleReconnect(ws, message.data);
            break;
          case 'ping':
            // Respond to heartbeat ping with pong
            sendMessage(ws, { type: 'pong', data: {} });
            break;
          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
        sendMessage(ws, {
          type: 'error',
          data: { message: 'Invalid message format' }
        });
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
      // Handle cleanup if needed
    });
  });

  async function handleJoinGame(ws: WebSocket, data: { roomCode: string; playerName: string; playerId: string }) {
    try {
      const { roomCode, playerName, playerId } = data;
      const result = await gameManager.addPlayer(roomCode, playerId, playerName);
      
      if (result.success) {
        // Store connection for this player
        (ws as any).roomCode = roomCode;
        (ws as any).playerId = playerId;
        
        // Send immediate game state to the reconnecting player
        sendMessage(ws, {
          type: 'gameState',
          data: result.gameState
        });
        
        // Broadcast updated game state to all players in the room
        broadcastToRoom(roomCode, {
          type: 'gameState',
          data: result.gameState
        });
        
        broadcastToRoom(roomCode, {
          type: 'playerJoined',
          data: { playerName, playerId }
        });
      } else {
        sendMessage(ws, {
          type: 'error',
          data: { message: result.error }
        });
      }
    } catch (error) {
      console.error('Error joining game:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Failed to join game' }
      });
    }
  }

  async function handlePlayerAction(ws: WebSocket, data: { roomCode: string; playerId: string; action: any }) {
    try {
      const { roomCode, playerId, action } = data;
      const result = await gameManager.handlePlayerAction(roomCode, playerId, action);
      
      if (result.success) {
        // Broadcast updated game state to all players
        broadcastToRoom(roomCode, {
          type: 'gameState',
          data: result.gameState
        });
        
        if (result.gameState?.stage === 'ended') {
          broadcastToRoom(roomCode, {
            type: 'gameEnd',
            data: result.gameState
          });
        }
      } else {
        sendMessage(ws, {
          type: 'error',
          data: { message: result.error }
        });
      }
    } catch (error) {
      console.error('Error handling player action:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Failed to process action' }
      });
    }
  }

  async function handleLeaveGame(ws: WebSocket, data: { roomCode: string; playerId: string }) {
    try {
      const { roomCode, playerId } = data;
      const result = await gameManager.removePlayer(roomCode, playerId);
      
      if (result.success) {
        broadcastToRoom(roomCode, {
          type: 'playerLeft',
          data: { playerId }
        });
        
        if (result.gameState) {
          broadcastToRoom(roomCode, {
            type: 'gameState',
            data: result.gameState
          });
        }
      }
    } catch (error) {
      console.error('Error leaving game:', error);
    }
  }

  async function handleStartGame(ws: WebSocket, data: { roomCode: string }) {
    try {
      const { roomCode } = data;
      const result = await gameManager.startGame(roomCode);
      
      if (result.success) {
        broadcastToRoom(roomCode, {
          type: 'gameState',
          data: result.gameState
        });
      } else {
        sendMessage(ws, {
          type: 'error',
          data: { message: result.error }
        });
      }
    } catch (error) {
      console.error('Error starting game:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Failed to start game' }
      });
    }
  }

  async function handleConfirmWinner(ws: WebSocket, data: { roomCode: string; playerId: string }) {
    try {
      const { roomCode, playerId } = data;
      const result = await gameManager.confirmWinner(roomCode, playerId);
      
      if (result.success && result.gameState) {
        broadcastToRoom(roomCode, {
          type: 'gameState',
          data: result.gameState
        });
      }
    } catch (error) {
      console.error('Error confirming winner:', error);
    }
  }

  async function handleUpdateSettings(ws: WebSocket, data: { roomCode: string; playerId: string; settings: { startingChips: number; smallBlind: number; bigBlind: number } }) {
    try {
      const { roomCode, playerId, settings } = data;
      const result = await gameManager.updateGameSettings(roomCode, playerId, settings);
      
      if (result.success && result.gameState) {
        broadcastToRoom(roomCode, {
          type: 'gameState',
          data: result.gameState
        });
      } else {
        sendMessage(ws, {
          type: 'error',
          data: { message: result.error || 'Failed to update settings' }
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Server error' }
      });
    }
  }

  async function handleIncreaseBlind(ws: WebSocket, data: { roomCode: string; playerId: string; newBigBlind?: number }) {
    try {
      const { roomCode, playerId, newBigBlind } = data;
      const result = await gameManager.increaseBlind(roomCode, playerId, newBigBlind);
      
      if (result.success && result.gameState) {
        broadcastToRoom(roomCode, {
          type: 'gameState',
          data: result.gameState
        });
      } else {
        sendMessage(ws, {
          type: 'error',
          data: { message: result.error || 'Failed to increase blind' }
        });
      }
    } catch (error) {
      console.error('Error increasing blind:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Server error' }
      });
    }
  }

  async function handleStartNextHand(ws: WebSocket, data: { roomCode: string; playerId: string }) {
    try {
      const { roomCode, playerId } = data;
      const result = await gameManager.startNextHand(roomCode, playerId);
      
      if (result.success && result.gameState) {
        broadcastToRoom(roomCode, {
          type: 'gameState',
          data: result.gameState
        });
      } else {
        sendMessage(ws, {
          type: 'error',
          data: { message: result.error || 'Failed to start next hand' }
        });
      }
    } catch (error) {
      console.error('Error starting next hand:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Server error' }
      });
    }
  }

  async function handleResetToSettings(ws: WebSocket, data: { roomCode: string; playerId: string }) {
    try {
      const { roomCode, playerId } = data;
      const result = await gameManager.resetToSettings(roomCode, playerId);
      
      if (result.success && result.gameState) {
        broadcastToRoom(roomCode, {
          type: 'gameState',
          data: result.gameState
        });
      } else {
        sendMessage(ws, {
          type: 'error',
          data: { message: result.error || 'Failed to reset game to settings' }
        });
      }
    } catch (error) {
      console.error('Error resetting game to settings:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Server error' }
      });
    }
  }

  async function handleReconnect(ws: WebSocket, data: { roomCode: string; playerId: string }) {
    try {
      const { roomCode, playerId } = data;
      
      // Store room code on the WebSocket for broadcasting
      (ws as any).roomCode = roomCode;
      (ws as any).playerId = playerId;
      
      // Get existing game state and send it to the reconnecting client
      const gameState = await storage.getGameState(roomCode);
      if (gameState) {
        sendMessage(ws, {
          type: 'gameState',
          data: gameState
        });
        console.log(`Player ${playerId} reconnected to room ${roomCode}`);
      } else {
        sendMessage(ws, {
          type: 'error',
          data: { message: 'Game not found' }
        });
      }
    } catch (error) {
      console.error('Error handling reconnect:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Failed to reconnect' }
      });
    }
  }

  async function handleSendMessage(ws: WebSocket, data: { roomCode: string; playerId: string; playerName: string; message: string }) {
    try {
      const { roomCode, playerId, playerName, message } = data;
      
      const chatMessage = {
        id: Date.now().toString(),
        playerId,
        playerName,
        message,
        timestamp: Date.now()
      };
      
      // 모든 플레이어(본인 포함)에게 메시지 전송
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN && 
            (client as any).roomCode === roomCode) {
          client.send(JSON.stringify({
            type: 'chatMessage',
            data: chatMessage
          }));
        }
      });
      
    } catch (error) {
      console.error('Error handling chat message:', error);
      sendMessage(ws, {
        type: 'error',
        data: { message: 'Failed to send message' }
      });
    }
  }

  function sendMessage(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  function broadcastToRoom(roomCode: string, message: WebSocketMessage) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client as any).roomCode === roomCode) {
        client.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
