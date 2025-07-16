import { useState } from "react";
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
  onMarkMessagesRead
}: PokerTableProps) {
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const isCurrentPlayerTurn = gameState.players[gameState.currentPlayerIndex]?.id === currentPlayerId;
  const isHost = gameState.hostPlayerId === currentPlayerId;
  const [isChatOpen, setIsChatOpen] = useState(false);

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

  // Mobile: 커뮤니티 카드 주변 배치 (겹침 방지)
  const mobileSeatPositions = [
    { top: '15%', left: '50%', transform: 'translateX(-50%)' }, // 커뮤니티 카드 위쪽
    { top: '20%', right: '3%', transform: 'none' }, // 커뮤니티 카드 오른쪽 위
    { top: '50%', right: '3%', transform: 'none' }, // 커뮤니티 카드 오른쪽 아래
    { top: '60%', left: '50%', transform: 'translateX(-50%)' }, // 커뮤니티 카드 밑 (현재 플레이어)
    { top: '50%', left: '3%', transform: 'none' }, // 커뮤니티 카드 왼쪽 아래
    { top: '20%', left: '3%', transform: 'none' }, // 커뮤니티 카드 왼쪽 위
  ];

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
        {/* Game Control Buttons - Mobile (파란색 영역 - 좌상단) */}
        <div className="absolute top-4 left-4 z-[9999] flex flex-col gap-2">
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
          {isHost && gameState.stage !== 'waiting' && onEndGame && (
            <Button 
              onClick={onEndGame}
              variant="outline"
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
            >
              게임 종료
            </Button>
          )}
          <Button
            onClick={handleToggleChat}
            variant="outline"
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 relative"
          >
            채팅
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[1.2rem] h-5 flex items-center justify-center rounded-full px-1"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
          <Button 
            onClick={onLeaveGame}
            variant="outline"
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white border-red-600"
          >
            Leave
          </Button>
        </div>

        {/* Mobile Game Layout */}
        <MobileGameLayout gameState={gameState} currentPlayerId={currentPlayerId}>
          {currentPlayer && currentPlayer.chips > 0 && isCurrentPlayerTurn && gameState.stage !== 'waiting' && gameState.stage !== 'ended' && gameState.stage !== 'showdown' && gameState.stage !== 'settings' && (
            <MobileBettingControls
              player={currentPlayer}
              gameState={gameState}
              onPlayerAction={onPlayerAction}
            />
          )}
        </MobileGameLayout>

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
            <Badge 
              className="absolute -top-2 -right-2 bg-red-500 text-white text-xs min-w-[1.2rem] h-5 flex items-center justify-center rounded-full px-1"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
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
        
      {/* Dealer Button */}
        {gameState.players.length > 0 && (() => {
          const dealerPlayer = gameState.players[gameState.dealerPosition];
          if (dealerPlayer) {
            if (isMobile) {
              const dealerIndexInReordered = reorderedPlayers.findIndex(p => p.id === dealerPlayer.id);
              if (dealerIndexInReordered >= 0) {
                return (
                  <div 
                    className="absolute w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-black border-2 border-gray-400 pulse-dealer"
                    style={{
                      ...mobileSeatPositions[dealerIndexInReordered],
                      transform: 'translate(-50%, -50%)',
                      zIndex: 5
                    }}
                  >
                    D
                  </div>
                );
              }
            } else {
              // PC에서는 원래 위치 사용
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
          }
          return null;
        })()}

      {/* Community Cards */}
      <div className={`absolute ${isMobile ? 'top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2' : 'top-[35%] left-1/2 transform -translate-x-1/2 -translate-y-1/2'}`}>
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
      <div className={`absolute text-center ${isMobile ? 'bottom-8 left-1/2 transform -translate-x-1/2' : 'top-[43%] left-1/2 transform -translate-x-1/2'}`}>
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

      {/* Current Bet Display */}
      {gameState.currentBet > 0 && (
        <div className={`absolute text-center ${isMobile ? 'top-[70%] left-1/2 transform -translate-x-1/2' : 'top-[50%] left-1/2 transform -translate-x-1/2'}`}>
          <div className={`bg-red-600/80 rounded-lg backdrop-blur ${isMobile ? 'px-3 py-1' : 'px-6 py-2'}`}>
            <div className={`text-white font-semibold ${isMobile ? 'text-sm' : 'text-lg'}`}>
              Current Bet: ${gameState.currentBet}
            </div>
          </div>
        </div>
      )}

      {/* Player Seats */}
      {reorderedPlayers.map((player, idx) => {
        // index는 재정렬된 배열의 인덱스(즉, 0번이 항상 자기 자신)
        const origIndex = gameState.players.findIndex(p => p.id === player.id);
        const isCurrentTurn = gameState.currentPlayerIndex === origIndex;
        const isDealer = gameState.dealerPosition === origIndex;
        const isSmallBlind = gameState.smallBlindPosition === origIndex;
        const isBigBlind = gameState.bigBlindPosition === origIndex;
        if (isMobile) {
          if (player.id === currentPlayerId) {
            return (
              <MobilePlayerCard
                key={player.id}
                player={player}
                isCurrentPlayer={true}
                isActive={isCurrentTurn}
                style={mobileSeatPositions[3]}
                gameStage={gameState.stage}
                showAllHoleCards={(gameState as any).showAllHoleCards || false}
              />
            );
          }
          const otherPlayers = reorderedPlayers.filter(p => p.id !== currentPlayerId);
          const otherPlayerIndex = otherPlayers.findIndex(p => p.id === player.id);
          if (otherPlayerIndex === -1) return null;
          const availablePositions = [0, 1, 2, 4, 5];
          const positionIndex = availablePositions[otherPlayerIndex % availablePositions.length];
          return (
            <MobilePlayerCard
              key={player.id}
              player={player}
              isCurrentPlayer={false}
              isActive={isCurrentTurn}
              style={mobileSeatPositions[positionIndex]}
              gameStage={gameState.stage}
              showAllHoleCards={(gameState as any).showAllHoleCards || false}
            />
          );
        } else {
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
        }
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
