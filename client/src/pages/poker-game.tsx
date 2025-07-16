import { useState, useEffect } from "react";
import { useParams } from "wouter";
import PokerTable from "@/components/poker/PokerTable";
import ConnectionStatus from "@/components/ConnectionStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWebSocket } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { Spade, Heart, Diamond, Club, Users, Plus } from "lucide-react";
import type { GameState, ChatMessage } from "@shared/schema";

export default function PokerGame() {
  const { roomCode } = useParams<{ roomCode?: string }>();
  const [currentRoomCode, setCurrentRoomCode] = useState(roomCode || "");
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  const { connect, disconnect, joinGame, sendPlayerAction, leaveGame, startGame, confirmWinner, updateSettings, increaseBlind, startNextHand, resetToSettings, sendChatMessage, reconnectToGame, isConnected: wsConnected, isReconnecting } = useWebSocket({
    onGameState: (state: GameState) => {
      setGameState(state);
    },
    onChatMessage: (message: ChatMessage) => {
      setChatMessages(prev => [...prev, message]);
      // Increment unread count if message is from another player
      if (message.playerId !== playerId) {
        setUnreadCount(prev => prev + 1);
      }
    },
    onPlayerJoined: (data: { playerName: string; playerId: string }) => {
      toast({
        title: "Player Joined",
        description: `${data.playerName} joined the game`,
      });
    },
    onPlayerLeft: (data: { playerId: string }) => {
      toast({
        title: "Player Left",
        description: "A player left the game",
      });
    },
    onError: (error: { message: string }) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (roomCode && playerName && playerId) {
      handleJoinGame();
    }
  }, [roomCode, playerName, playerId]);

  // Auto-reconnect to game when connection is restored
  useEffect(() => {
    if (wsConnected && !isReconnecting && roomCode && playerId && gameState) {
      // If we were in a game and connection is restored, try to reconnect
      reconnectToGame(roomCode, playerId);
    }
  }, [wsConnected, isReconnecting, roomCode, playerId, gameState, reconnectToGame]);

  const generatePlayerId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const handleCreateGame = async () => {
    try {
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const response = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode: newRoomCode,
          maxPlayers: 6,
          smallBlind: 10,
          bigBlind: 20,
        }),
      });

      if (response.ok) {
        setCurrentRoomCode(newRoomCode);
        toast({
          title: "Game Created",
          description: `Room code: ${newRoomCode}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create game",
        variant: "destructive",
      });
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    if (!currentRoomCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room code",
        variant: "destructive",
      });
      return;
    }

    const newPlayerId = playerId || generatePlayerId();
    setPlayerId(newPlayerId);

    try {
      await connect();
      
      joinGame(currentRoomCode, playerName.trim(), newPlayerId);
      setShowJoinForm(false);
      setIsConnected(true);
      setChatMessages([]); // 방 입장 시 채팅 초기화
    } catch (error) {
      toast({
        title: "Connection Error",
        description: "Failed to connect to game server",
        variant: "destructive",
      });
    }
  };

  const handlePlayerAction = (action: any) => {
    if (!gameState || !playerId) return;

    sendPlayerAction(gameState.roomCode, playerId, action);
  };

  const handleLeaveGame = () => {
    if (gameState && playerId) {
      leaveGame(gameState.roomCode, playerId);
    }
    disconnect();
    setIsConnected(false);
    setShowJoinForm(true);
    setGameState(null);
  };

  const handleStartGame = () => {
    if (gameState) {
      startGame(gameState.roomCode);
    }
  };

  const handleConfirmWinner = () => {
    if (gameState && playerId) {
      confirmWinner(gameState.roomCode, playerId);
    }
  };

  const handleUpdateSettings = (settings: { startingChips: number; smallBlind: number; bigBlind: number }) => {
    if (gameState && playerId) {
      updateSettings(gameState.roomCode, playerId, settings);
    }
  };

  const handleIncreaseBlind = (newBigBlind?: number) => {
    if (gameState && playerId) {
      increaseBlind(gameState.roomCode, playerId, newBigBlind);
    }
  };

  const handleStartNextHand = () => {
    if (gameState && playerId) {
      startNextHand(gameState.roomCode, playerId);
    }
  };

  const handleEndGame = () => {
    if (gameState && playerId) {
      // Reset game to settings stage for all players
      if (gameState.hostPlayerId === playerId) {
        resetToSettings(gameState.roomCode, playerId);
      }
    }
  };

  const handleSendMessage = (message: string) => {
    if (gameState && playerId && playerName) {
      sendChatMessage(gameState.roomCode, playerId, playerName, message);
    }
  };

  const handleMarkMessagesRead = () => {
    setUnreadCount(0);
  };

  if (showJoinForm) {
    return (
      <div className="h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto space-y-4">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="flex justify-center items-center space-x-2 mb-2">
              <Spade className="h-6 w-6 text-white" />
              <Heart className="h-6 w-6 text-red-500" />
              <Diamond className="h-6 w-6 text-red-500" />
              <Club className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Texas Hold'em</h1>
            <p className="text-green-200 text-sm">Join or create a poker game</p>
          </div>

          {/* Form Card */}
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-center mb-4">Join Game</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleJoinGame()}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Code</label>
                <Input
                  placeholder="Enter room code"
                  value={currentRoomCode}
                  onChange={(e) => setCurrentRoomCode(e.target.value.toUpperCase())}
                  onKeyPress={(e) => e.key === "Enter" && handleJoinGame()}
                />
              </div>

              <div className="space-y-3 pt-2">
                <Button 
                  onClick={handleJoinGame} 
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2"
                  disabled={!playerName.trim() || !currentRoomCode.trim()}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Join Game
                </Button>
                
                <div className="text-center text-xs text-gray-500">or</div>
                
                <Button 
                  onClick={handleCreateGame} 
                  variant="outline" 
                  className="w-full py-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  disabled={!playerName.trim()}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Game
                </Button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-green-200 text-xs">
            <p>Texas Hold'em • 4 betting rounds</p>
            <p>Starting chips: 1,000 | Blinds: 10/20</p>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Connecting to game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900">
      <ConnectionStatus isConnected={wsConnected} isReconnecting={isReconnecting} />
      <PokerTable
        gameState={gameState}
        currentPlayerId={playerId}
        onPlayerAction={handlePlayerAction}
        onLeaveGame={handleLeaveGame}
        onStartGame={handleStartGame}
        onConfirmWinner={handleConfirmWinner}
        onUpdateSettings={handleUpdateSettings}
        onIncreaseBlind={handleIncreaseBlind}
        onStartNextHand={handleStartNextHand}
        onEndGame={handleEndGame}
        chatMessages={chatMessages}
        onSendMessage={handleSendMessage}
        unreadCount={unreadCount}
        onMarkMessagesRead={handleMarkMessagesRead}
      />
    </div>
  );
}
