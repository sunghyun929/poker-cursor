import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Crown } from "lucide-react";
import type { Player, GameState, Card } from "@shared/schema";

interface MobileGameLayoutProps {
  gameState: GameState;
  currentPlayerId: string;
  onLeaveGame?: () => void;
  onEndGame?: () => void;
  onStartGame?: () => void;
  onOpenChat?: () => void;
  unreadCount?: number;
  children: React.ReactNode; // 베팅 컨트롤
}

export default function MobileGameLayout({ gameState, currentPlayerId, onLeaveGame, onEndGame, onStartGame, onOpenChat, unreadCount, children }: MobileGameLayoutProps) {
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const players = gameState.players;
  const myIndex = players.findIndex(p => p.id === currentPlayerId);
  const playerCount = players.length;

  // 시계방향으로 플레이어 재정렬 (현재 플레이어 기준)
  const reorderedPlayers = myIndex !== -1 ? [
    ...players.slice(myIndex),
    ...players.slice(0, myIndex)
  ] : players;
  
  // 내 자신을 제외한 다른 플레이어들 (시계방향 순서)
  const otherPlayers = reorderedPlayers.slice(1);
  
  // 모바일 배치: 나를 제외한 플레이어들을 시계방향으로 배치
  // 2명: [상단]
  // 3명: [상단, 우측]
  // 4명: [상단, 우측, 좌측]
  // 5명: [상단좌, 상단우, 우측, 좌측]
  // 6명: [상단좌, 상단우, 우측, 좌측하, 좌측상]
  
  const getPlayersByPosition = () => {
    const positions = {
      top: [] as Player[],
      right: [] as Player[],
      left: [] as Player[]
    };
    
    otherPlayers.forEach((player, index) => {
      if (otherPlayers.length === 1) {
        positions.top.push(player);
      } else if (otherPlayers.length === 2) {
        if (index === 0) positions.top.push(player);
        else positions.right.push(player);
      } else if (otherPlayers.length === 3) {
        if (index === 0) positions.top.push(player);
        else if (index === 1) positions.right.push(player);
        else positions.left.push(player);
      } else if (otherPlayers.length === 4) {
        if (index === 0 || index === 1) positions.top.push(player);
        else if (index === 2) positions.right.push(player);
        else positions.left.push(player);
      } else {
        // 5명 이상일 때
        if (index < 2) positions.top.push(player);
        else if (index < Math.ceil((otherPlayers.length + 1) / 2)) positions.right.push(player);
        else positions.left.push(player);
      }
    });
    
    return positions;
  };
  
  const playerPositions = getPlayersByPosition();

  const renderCard = (card: Card | null, index: number) => {
    if (!card) {
      return (
        <div key={`empty-${index}`} className="w-12 h-16 bg-gray-400 rounded-md border-2 border-dashed border-gray-500 flex items-center justify-center">
          <div className="text-gray-600 text-xs">?</div>
        </div>
      );
    }
    return (
      <div key={index} className="w-12 h-16 bg-white rounded-md border border-gray-300 flex flex-col items-center justify-center shadow-sm">
        <div className={`font-bold text-xs ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>{card.rank}</div>
        <div className={`text-lg font-bold ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : card.suit === 'spades' ? 'text-blue-900' : 'text-green-800'}`}>{card.suit === 'hearts' && '♥'}{card.suit === 'diamonds' && '♦'}{card.suit === 'clubs' && '♣'}{card.suit === 'spades' && '♠'}</div>
      </div>
    );
  };

  // showAllHoleCards, showdown 변수를 받아서 renderPlayerCard에 전달
  const showAllHoleCards = (gameState as any).showAllHoleCards || gameState.stage === 'showdown';

  const renderPlayerCard = (player: Player, isMe = false) => {
    if (!player) return null;
    const isCurrentTurn = gameState.currentPlayerIndex === players.findIndex(p => p.id === player.id);
    const isDealer = gameState.dealerPosition === players.findIndex(p => p.id === player.id);
    const isSmallBlind = gameState.smallBlindPosition === players.findIndex(p => p.id === player.id);
    const isBigBlind = gameState.bigBlindPosition === players.findIndex(p => p.id === player.id);
    // 내 카드가 아니고, showAllHoleCards가 false면 카드 가리기
    const shouldHideCards = !isMe && !showAllHoleCards;
    return (
      <div className={`bg-gray-800 rounded-lg p-2 shadow-md min-w-[70px] max-w-[90px] mx-auto mb-2 ${isCurrentTurn ? 'ring-2 ring-yellow-400' : ''} ${player.hasFolded ? 'opacity-50' : ''}`}> 
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3 text-white" />
            <span className="text-white text-xs font-medium truncate max-w-[60px]">
              {player.name}{isMe && <span className="text-yellow-400 ml-1">(ME)</span>}
            </span>
          </div>
          <div className="flex space-x-1">
            {isDealer && <Badge variant="outline" className="text-xs p-0.5 h-4"><Crown className="h-2 w-2" /></Badge>}
            {isSmallBlind && <Badge variant="secondary" className="text-xs p-0.5 h-4">SB</Badge>}
            {isBigBlind && <Badge variant="secondary" className="text-xs p-0.5 h-4">BB</Badge>}
          </div>
        </div>
        <div className="flex space-x-1 mb-1 justify-center">
          {shouldHideCards
            ? [0, 1].map((i) => (
                <div key={i} className="w-12 h-16 bg-blue-800 rounded border border-blue-600 flex items-center justify-center">
                  <div className="text-blue-300 text-xl">🂠</div>
                </div>
              ))
            : player.cards.map((card, index) => renderCard(card, index))}
        </div>
        <div className="text-center">
          <div className="text-green-400 font-bold text-xs">${player.chips}</div>
          {player.currentBet > 0 && <div className="text-orange-400 text-xs">Bet: ${player.currentBet}</div>}
        </div>
      </div>
    );
  };

  // 커뮤니티 카드 표시
  const getVisibleCommunityCards = () => {
    switch (gameState.stage) {
      case 'flop': return 3;
      case 'turn': return 4;
      case 'river':
      case 'showdown': return 5;
      default: return 0;
    }
  };
  const visibleCards = getVisibleCommunityCards();

  return (
    <div className="h-screen bg-green-800 relative overflow-hidden font-sans">
      {/* 좌측 상단 세로 버튼 */}
      <div className="absolute top-4 left-4 z-[9999] flex flex-col gap-2">
        {gameState.stage === 'waiting' && gameState.players.length >= 2 && gameState.hostPlayerId === currentPlayerId && onStartGame && (
          <Button 
            variant="outline" 
            className="bg-green-600 text-white rounded shadow hover:bg-green-700"
            onClick={onStartGame}
          >
            Start Game
          </Button>
        )}
        <div className="relative">
          <Button 
            variant="outline" 
            className="bg-blue-600 text-white rounded shadow hover:bg-blue-700"
            onClick={onOpenChat}
          >
            채팅
          </Button>
          {unreadCount && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </div>
          )}
        </div>
        <Button 
          variant="outline" 
          className="bg-red-600 text-white rounded shadow hover:bg-red-700"
          onClick={onLeaveGame}
        >
          Leave
        </Button>
        {gameState.hostPlayerId === currentPlayerId && gameState.stage !== 'waiting' && onEndGame && (
          <Button 
            variant="outline" 
            className="bg-orange-500 text-white rounded shadow hover:bg-orange-600"
            onClick={onEndGame}
          >
            게임종료
          </Button>
        )}
      </div>

      {/* 개선된 모바일 레이아웃 */}
      <div className="h-full flex flex-col relative">
        {/* 상단 플레이어들 */}
        {playerPositions.top.length > 0 && (
          <div className="absolute top-16 left-1/2 transform -translate-x-1/2 flex gap-4 z-10">
            {playerPositions.top.map((player) => (
              <div key={player.id}>{renderPlayerCard(player)}</div>
            ))}
          </div>
        )}
        
        {/* 중앙 영역 */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* 좌측 플레이어들 */}
          {playerPositions.left.length > 0 && (
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3">
              {playerPositions.left.map((player) => (
                <div key={player.id}>{renderPlayerCard(player)}</div>
              ))}
            </div>
          )}
          
          {/* 중앙 커뮤니티 카드 */}
          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-1">
              {Array.from({ length: 5 }, (_, index) => {
                const card = index < visibleCards ? gameState.communityCards[index] : null;
                return renderCard(card, index);
              })}
            </div>
            <div className="text-white text-sm bg-black/50 px-3 py-1 rounded-full">
              Pot: ${gameState.pot}
            </div>
          </div>
          
          {/* 우측 플레이어들 */}
          {playerPositions.right.length > 0 && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex flex-col gap-3">
              {playerPositions.right.map((player) => (
                <div key={player.id}>{renderPlayerCard(player)}</div>
              ))}
            </div>
          )}
        </div>
        
        {/* 하단 내 플레이어 */}
        {currentPlayer && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
            {renderPlayerCard(currentPlayer, true)}
          </div>
        )}
      </div>

      {/* 베팅 컨트롤 - 하단 고정 */}
      <div className="fixed bottom-2 left-0 right-0 z-30 px-2 bg-black/70 rounded-t-lg py-2">
        {children}
      </div>
    </div>
  );
}
