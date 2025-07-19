import React from 'react';
import PlayerSeat from "./PlayerSeat";
import CommunityCards from "./CommunityCards";
import BettingControls from "./BettingControls";
import GameInfo from "./GameInfo";
import WinnerDisplay from "./WinnerDisplay";
import GameSettings from "./GameSettings";
import BlindIncreasePrompt from "./BlindIncreasePrompt";
import ChatWindow from "./ChatWindow";
import MobilePlayerCard from "./MobilePlayerCard";
import MobileBettingControls from "./MobileBettingControls";
import MobileCommunityCards from "./MobileCommunityCards";
import MobileGameLayout from "./MobileGameLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Square, MessageCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { GameState, PlayerAction, ChatMessage, Player } from "@shared/schema";

interface PokerTableProps {
  gameState: GameState;
  currentPlayerId: string;
  onPlayerAction: (action: PlayerAction) => void;
  onLeaveGame: () => void;
  onStartGame: () => void;
  onConfirmWinner: () => void;
  onUpdateSettings: (settings: { startingChips: number; smallBlind: number; bigBlind: number }) => void;
  onIncreaseBlind: (newBigBlind?: number) => void;
  onStartNextHand: () => void;
  onEndGame?: () => void;
  chatMessages: ChatMessage[];
  onSendMessage: (message: string) => void;
  unreadCount: number;
  onMarkMessagesRead: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}

export default function PokerTable({ 
  gameState, 
  currentPlayerId, 
  onPlayerAction, 
  onLeaveGame,
  onStartGame,
  onConfirmWinner,
  onUpdateSettings,
  onIncreaseBlind,
  onStartNextHand,
  onEndGame,
  chatMessages,
  onSendMessage,
  unreadCount,
  onMarkMessagesRead,
  isChatOpen,
  setIsChatOpen
}: PokerTableProps) {
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerTurn = gameState.players[gameState.currentPlayerIndex]?.id === currentPlayerId;
  const isHost = gameState.hostPlayerId === currentPlayerId;
  // const [isChatOpen, setIsChatOpen] = useState(false); // This line is removed as per edit hint

  // 현재 플레이어를 첫 번째 위치로 재정렬
  const reorderPlayersForCurrentPlayer = (players: Player[], currentPlayerId: string) => {
    const currentPlayerIndex = players.findIndex(p => p.id === currentPlayerId);
    if (currentPlayerIndex === -1) return players;
    
    return [
      ...players.slice(currentPlayerIndex),
      ...players.slice(0, currentPlayerIndex)
    ];
  };

  const reorderedPlayers = reorderPlayersForCurrentPlayer(gameState.players, currentPlayerId);
  const isMobile = useIsMobile();

  // PC: 원래 고정 위치 배치 (플레이어 재정렬 없음)
  const pcSeatPositions = [
    { top: '2%', left: '50%', transform: 'translateX(-50%)' }, // Top center
    { top: '20%', right: '5%', transform: 'none' }, // Top right
    { top: '60%', right: '5%', transform: 'none' }, // Bottom right
    { bottom: '25%', left: '35%', transform: 'translateX(-50%)' }, // Bottom center-left
    { top: '60%', left: '5%', transform: 'none' }, // Bottom left
    { top: '20%', left: '5%', transform: 'none' }, // Top left
  ];

  // Mobile: 가변 인원수에 따른 플레이어 배치 위치 정의
  const mobileSeatPositions = {
    P1: { top: '82%', left: '50%', transform: 'translateX(-50%)' }, // 현재 플레이어 (항상 고정)
    P2: { top: '66%', left: '15%', transform: 'none' }, // 좌측 하단
    P3: { top: '32%', left: '15%', transform: 'none' }, // 좌측 상단  
    P4: { top: '18%', left: '50%', transform: 'translateX(-50%)' }, // 상단 중앙
    P5: { top: '32%', right: '5%', transform: 'none' }, // 우측 상단
    P6: { top: '66%', right: '5%', transform: 'none' }, // 우측 하단
  };

  // 인원수에 따른 배치 순서 정의
  const getPlayerPositions = (totalPlayers: number) => {
    switch (totalPlayers) {
      case 2: return ['P4'];
      case 3: return ['P3', 'P5'];
      case 4: return ['P2', 'P4', 'P6'];
      case 5: return ['P2', 'P3', 'P5', 'P6'];
      case 6: return ['P2', 'P3', 'P4', 'P5', 'P6'];
      default: return [];
    }
  };

  const handleToggleChat = () => {
    if (!isChatOpen && unreadCount > 0) {
      onMarkMessagesRead();
    }
    setIsChatOpen(!isChatOpen);
  };

  const handleSendMessage = (message: string) => {
    onSendMessage(message);
  };

  // 모바일 전용 레이아웃 사용
  if (isMobile) {
    return (
      <>
        {/* Mobile Game Layout */}
        <MobileGameLayout 
          gameState={gameState} 
          currentPlayerId={currentPlayerId}
          onLeaveGame={onLeaveGame}
          onEndGame={onEndGame}
          onStartGame={onStartGame}
          onOpenChat={handleToggleChat}
          unreadCount={unreadCount}
        >
          {currentPlayer && currentPlayer.chips > 0 && isCurrentPlayerTurn && gameState.stage !== 'waiting' && gameState.stage !== 'ended' && gameState.stage !== 'showdown' && gameState.stage !== 'settings' && (
            <MobileBettingControls
              player={currentPlayer}
              gameState={gameState}
              onPlayerAction={onPlayerAction}
            />
          )}
        </MobileGameLayout>

        {/* Mobile Player Cards - Grid 영역 기반 배치 */}
        {(() => {
          const totalPlayers = gameState.players.length;
          const availablePositions = getPlayerPositions(totalPlayers);
          const otherPlayers = reorderedPlayers.filter(p => p.id !== currentPlayerId);
          
          return reorderedPlayers.map((player, idx) => {
            const origIndex = gameState.players.findIndex(p => p.id === player.id);
            const isCurrentTurn = gameState.currentPlayerIndex === origIndex;
            
            // 현재 플레이어는 항상 Grid 영역 p1에 배치
            if (player.id === currentPlayerId) {
              return (
                <div
                  key={player.id}
                  className="absolute flex items-center justify-center"
                  style={{ 
                    gridArea: 'p1',
                    zIndex: 10
                  }}
                >
                  <MobilePlayerCard
                    player={player}
                    isCurrentPlayer={true}
                    isActive={isCurrentTurn}
                    style={{ position: 'static' }}
                    gameStage={gameState.stage}
                    showAllHoleCards={(gameState as any).showAllHoleCards || false}
                  />
                </div>
              );
            }
            
            // 다른 플레이어들은 Grid 영역에 배치
            const otherPlayerIndex = otherPlayers.findIndex(p => p.id === player.id);
            if (otherPlayerIndex === -1 || otherPlayerIndex >= availablePositions.length) return null;
            
            const gridArea = availablePositions[otherPlayerIndex].toLowerCase();
            
            return (
              <div
                key={player.id}
                className="absolute flex items-center justify-center"
                style={{ 
                  gridArea: gridArea,
                  zIndex: 10
                }}
              >
                <MobilePlayerCard
                  player={player}
                  isCurrentPlayer={false}
                  isActive={isCurrentTurn}
                  style={{ position: 'static' }}
                  gameStage={gameState.stage}
                  showAllHoleCards={(gameState as any).showAllHoleCards || false}
                />
              </div>
            );
          });
        })()}

        {/* Dealer Button - Mobile (Grid 기반) */}
        {gameState.players.length > 0 && (() => {
          const dealerPlayer = gameState.players[gameState.dealerPosition];
          if (!dealerPlayer) return null;
          
          const totalPlayers = gameState.players.length;
          const availablePositions = getPlayerPositions(totalPlayers);
          const otherPlayers = reorderedPlayers.filter(p => p.id !== currentPlayerId);
          
          let gridArea;
          
          // 딜러가 현재 플레이어인 경우
          if (dealerPlayer.id === currentPlayerId) {
            gridArea = 'p1';
          } else {
            // 딜러가 다른 플레이어인 경우
            const otherPlayerIndex = otherPlayers.findIndex(p => p.id === dealerPlayer.id);
            if (otherPlayerIndex >= 0 && otherPlayerIndex < availablePositions.length) {
              gridArea = availablePositions[otherPlayerIndex].toLowerCase();
            }
          }
          
          if (!gridArea) return null;
          
          return (
            <div 
              className="absolute flex items-center justify-center pointer-events-none"
              style={{
                gridArea: gridArea,
                zIndex: 20
              }}
            >
              <div 
                className="rounded-full bg-white flex items-center justify-center font-bold text-black border-2 border-gray-400 pulse-dealer"
                style={{
                  width: 'var(--spacing-lg)',
                  height: 'var(--spacing-lg)',
                  fontSize: 'var(--text-xs)',
                  transform: 'translate(50%, -50%)'
                }}
              >
                D
              </div>
            </div>
          );
        })()}

        {/* Winner Display - Mobile */}
        {(gameState.lastAction && (
          gameState.lastAction.action.includes('wins') || 
          gameState.lastAction.action.includes('split') ||
          gameState.lastAction.action.includes('win by fold')
        )) && (
          <WinnerDisplay 
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            onConfirm={onConfirmWinner}
            onIncreaseBlind={onIncreaseBlind}
            onStartNextHand={onStartNextHand}
          />
        )}

        {/* Other overlays */}
        {gameState.stage === 'settings' && (
          <GameSettings 
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            onUpdateSettings={onUpdateSettings}
            onStartGame={onStartGame}
          />
        )}

        {gameState.blindIncrease?.pending && (
          <BlindIncreasePrompt
            gameState={gameState}
            currentPlayerId={currentPlayerId}
            onIncreaseBlind={onIncreaseBlind}
          />
        )}

        {isChatOpen && (
          <ChatWindow
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            onClose={() => setIsChatOpen(false)}
            currentPlayerId={currentPlayerId}
          />
        )}
      </>
    );
  }

  return (
    <div className={`relative min-h-screen poker-table overflow-hidden ${
      currentPlayer && isCurrentPlayerTurn && gameState.stage !== 'waiting' && gameState.stage !== 'ended' && gameState.stage !== 'showdown' 
        ? 'pb-48' 
        : ''
    }`}>
      {/* Game Control Buttons */}
      <div className="absolute top-4 right-4 z-[9999] flex gap-2 control-buttons">
        {gameState.stage === 'waiting' && gameState.players.length >= 2 && (
          <Button 
            onClick={onStartGame}
            variant="outline"
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white border-green-600"
          >
            Start Game
          </Button>
        )}
        {/* 방장용 게임 종료 버튼 */}
        {isHost && gameState.stage !== 'waiting' && onEndGame && (
          <Button 
            onClick={onEndGame}
            variant="outline"
            size="sm"
            className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
          >
            <Square className="mr-2 h-4 w-4" />
            게임 종료
          </Button>
        )}
        {/* Chat Button */}
        <Button
          onClick={handleToggleChat}
          variant="outline"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 relative"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          채팅
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[1.2rem] h-5 flex items-center justify-center rounded-full px-1">
              N
            </div>
          )}
        </Button>
        <Button 
          onClick={onLeaveGame}
          variant="outline"
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white border-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Leave
        </Button>
      </div>

      {/* Game Info - Hidden on mobile */}
      <div className={`absolute top-4 left-4 z-10 ${isMobile ? 'hidden' : ''}`}>
        <GameInfo gameState={gameState} />
      </div>

      {/* Table Shape - Hidden on mobile for cleaner UI */}
      {!isMobile && (
        <div 
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full border-8 border-amber-700 pc-table"
          style={{ 
            width: '800px', 
            height: '400px', 
            top: '40%'
          }}
        >
          {/* Table Felt Pattern */}
          <div className="absolute inset-2 rounded-full opacity-30">
            <div className="w-full h-full rounded-full border-2 border-dashed border-amber-600"></div>
          </div>
        </div>
      )}
        
      {/* Dealer Button - PC Only */}
      {!isMobile && gameState.players.length > 0 && (() => {
        const dealerPlayer = gameState.players[gameState.dealerPosition];
        if (dealerPlayer) {
          return (
            <div 
              className="absolute w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-gray-400 pulse-dealer"
              style={{
                ...pcSeatPositions[gameState.dealerPosition % pcSeatPositions.length],
                transform: 'translate(-50%, -50%)',
                zIndex: 5
              }}
            >
              D
            </div>
          );
        }
        return null;
      })()}

      {/* Community Cards */}
      <div className={`absolute ${isMobile ? 'top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2' : 'top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2'}`}>
        {isMobile ? (
          <MobileCommunityCards 
            cards={gameState.communityCards} 
            stage={gameState.stage}
          />
        ) : (
          <CommunityCards 
            cards={gameState.communityCards} 
            stage={gameState.stage}
          />
        )}
      </div>

      {/* Pot Display */}
      <div className={`absolute text-center ${isMobile ? 'top-[25%] left-1/2 transform -translate-x-1/2' : 'top-[43%] left-1/2 transform -translate-x-1/2'}`}>
        <div className={`bg-black/70 rounded-lg backdrop-blur ${isMobile ? 'px-2 py-1' : 'px-4 py-2'}`}>
          <div className={`text-yellow-400 font-bold ${isMobile ? 'text-xs' : 'text-lg'}`}>
            Pot: ${gameState.pot}
          </div>
          {gameState.sidePots.length > 0 && (
            <div className={`text-yellow-300 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Side Pots: {gameState.sidePots.map(sp => `$${sp.amount}`).join(", ")}
            </div>
          )}
        </div>
      </div>

      {/* Current Bet Display - PC Only */}
      {!isMobile && gameState.currentBet > 0 && (
        <div className="absolute text-center top-[50%] left-1/2 transform -translate-x-1/2">
          <div className="bg-red-600/80 rounded-lg backdrop-blur px-6 py-2">
            <div className="text-white font-semibold text-lg">
              Current Bet: ${gameState.currentBet}
            </div>
          </div>
        </div>
      )}

      {/* Player Seats - PC Only */}
      {!isMobile && reorderedPlayers.map((player, idx) => {
        const origIndex = gameState.players.findIndex(p => p.id === player.id);
        const isCurrentTurn = gameState.currentPlayerIndex === origIndex;
        const isDealer = gameState.dealerPosition === origIndex;
        const isSmallBlind = gameState.smallBlindPosition === origIndex;
        const isBigBlind = gameState.bigBlindPosition === origIndex;
        
        return (
          <div
            key={player.id}
            className="absolute"
            style={pcSeatPositions[idx % pcSeatPositions.length]}
          >
            <PlayerSeat
              player={player}
              isCurrentTurn={isCurrentTurn}
              isCurrentPlayer={player.id === currentPlayerId}
              isDealer={isDealer}
              isSmallBlind={isSmallBlind}
              isBigBlind={isBigBlind}
              gameStage={gameState.stage}
              showAllHoleCards={(gameState as any).showAllHoleCards || false}
            />
          </div>
        );
      })}

      {/* Betting Controls - Separate for Mobile and PC */}
      {currentPlayer && currentPlayer.chips > 0 && isCurrentPlayerTurn && gameState.stage !== 'waiting' && gameState.stage !== 'ended' && gameState.stage !== 'showdown' && gameState.stage !== 'settings' && (
        isMobile ? (
          <MobileBettingControls
            player={currentPlayer}
            gameState={gameState}
            onPlayerAction={onPlayerAction}
          />
        ) : (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
            <BettingControls
              player={currentPlayer!}
              gameState={gameState}
              onAction={onPlayerAction}
            />
          </div>
        )
      )}



      {/* Game Settings Overlay */}
      {gameState.stage === 'settings' && (
        <GameSettings
          gameState={gameState}
          currentPlayerId={currentPlayerId}
          onUpdateSettings={onUpdateSettings}
          onStartGame={onStartGame}
        />
      )}

      {/* Blind Increase Prompt */}
      <BlindIncreasePrompt
        gameState={gameState}
        currentPlayerId={currentPlayerId}
        onIncreaseBlind={onIncreaseBlind}
      />

      {/* Winner Display Overlay */}
      <WinnerDisplay 
        gameState={gameState} 
        currentPlayerId={currentPlayerId}
        onConfirm={onConfirmWinner}
        onIncreaseBlind={onIncreaseBlind}
        onStartNextHand={onStartNextHand}
      />

      {/* Chat Window */}
      {isChatOpen && (
        <ChatWindow
          messages={chatMessages}
          onSendMessage={handleSendMessage}
          onClose={() => setIsChatOpen(false)}
          currentPlayerId={currentPlayerId}
        />
      )}
    </div>
  );
}
