import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Crown } from "lucide-react";
import type { Player, GameState, Card } from "@shared/schema";

interface MobileGameLayoutProps {
  gameState: GameState;
  currentPlayerId: string;
  children: React.ReactNode; // 베팅 컨트롤
}

export default function MobileGameLayout({ gameState, currentPlayerId, children }: MobileGameLayoutProps) {
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  
  // 딜러 포지션을 기준으로 포커 테이블 시계방향 순서 결정
  const dealerIndex = gameState.dealerPosition;
  const currentPlayerIndex = gameState.players.findIndex(p => p.id === currentPlayerId);
  
  // 딜러부터 시계방향으로 플레이어들을 정렬
  const orderedPlayers = [];
  for (let i = 0; i < gameState.players.length; i++) {
    const playerIndex = (dealerIndex + i) % gameState.players.length;
    orderedPlayers.push(gameState.players[playerIndex]);
  }
  
  // 현재 플레이어를 제외한 다른 플레이어들을 현재 플레이어 기준으로 시계방향 순서로 배치
  const currentPlayerOrderIndex = orderedPlayers.findIndex(p => p.id === currentPlayerId);
  const otherPlayers = [];
  
  for (let i = 1; i < orderedPlayers.length; i++) {
    const playerIndex = (currentPlayerOrderIndex + i) % orderedPlayers.length;
    otherPlayers.push(orderedPlayers[playerIndex]);
  }

  const renderCard = (card: Card | null, index: number) => {
    if (!card) {
      return (
        <div key={`empty-${index}`} className="w-12 h-16 bg-gray-400 rounded-md border-2 border-dashed border-gray-500 flex items-center justify-center">
          <div className="text-gray-600 text-xs">?</div>
        </div>
      );
    }

    return (
      <div 
        key={index}
        className="w-12 h-16 bg-white rounded-md border border-gray-300 flex flex-col items-center justify-center shadow-sm"
      >
        <div className={`font-bold text-xs ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>
          {card.rank}
        </div>
        <div className={`text-lg font-bold ${
          card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 
          card.suit === 'spades' ? 'text-blue-900' : 'text-green-800'
        }`}>
          {card.suit === 'hearts' && '♥'}
          {card.suit === 'diamonds' && '♦'}
          {card.suit === 'clubs' && '♣'}
          {card.suit === 'spades' && '♠'}
        </div>
      </div>
    );
  };

  const renderPlayerCard = (player: Player, isCompact: boolean = false) => {
    const isCurrentTurn = gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === player.id);
    const isDealer = gameState.dealerPosition === gameState.players.findIndex(p => p.id === player.id);
    const isSmallBlind = gameState.smallBlindPosition === gameState.players.findIndex(p => p.id === player.id);
    const isBigBlind = gameState.bigBlindPosition === gameState.players.findIndex(p => p.id === player.id);

    return (
      <div className={`bg-gray-800 rounded-lg p-2 ${isCurrentTurn ? 'ring-2 ring-yellow-400' : ''} ${player.hasFolded ? 'opacity-50' : ''}`}>
        {/* 플레이어 정보 */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3 text-white" />
            <span className="text-white text-xs font-medium truncate max-w-[60px]">
              {player.name}
            </span>
          </div>
          <div className="flex space-x-1">
            {isDealer && <Badge variant="outline" className="text-xs p-0.5 h-4"><Crown className="h-2 w-2" /></Badge>}
            {isSmallBlind && <Badge variant="secondary" className="text-xs p-0.5 h-4">SB</Badge>}
            {isBigBlind && <Badge variant="secondary" className="text-xs p-0.5 h-4">BB</Badge>}
          </div>
        </div>

        {/* 카드 (현재 플레이어가 아닌 경우만 표시) */}
        {player.id !== currentPlayerId && (
          <div className="flex space-x-1 mb-1 justify-center">
            {player.cards.map((card, index) => {
              // Only show cards during showdown for non-folded players
              if ((gameState.stage === 'showdown' || (gameState as any).showAllHoleCards) && !player.hasFolded) {
                return renderCard(card, index);
              } else {
                return (
                  <div key={index} className="w-8 h-11 bg-blue-800 rounded border border-blue-600 flex items-center justify-center">
                    <div className="text-blue-300 text-xs">🂠</div>
                  </div>
                );
              }
            })}
          </div>
        )}

        {/* 칩과 베팅 정보 */}
        <div className="text-center">
          <div className="text-green-400 font-bold text-xs">${player.chips}</div>
          {player.currentBet > 0 && (
            <div className="text-orange-400 text-xs">Bet: ${player.currentBet}</div>
          )}
        </div>

        {/* 상태 */}
        <div className="text-center mt-1">
          <Badge className={`text-xs ${getStatusColor(player, isCurrentTurn)} text-white`}>
            {getPlayerStatus(player, isCurrentTurn, gameState.stage)}
          </Badge>
        </div>
      </div>
    );
  };

  const getPlayerStatus = (player: Player, isCurrentTurn: boolean, gameStage: string) => {
    if (player.hasFolded) return "Folded";
    if (player.isAllIn) return "All In";
    if (isCurrentTurn) return "Turn";
    
    if (player.hasActed && player.lastAction && gameStage !== 'waiting') {
      switch (player.lastAction.type) {
        case 'check': return "Check";
        case 'call': return `Call $${player.lastAction.amount}`;
        case 'bet': return `Bet $${player.lastAction.amount}`;
        case 'raise': return `Raise $${player.lastAction.amount}`;
        case 'allIn': return `All In`;
        default: return "Active";
      }
    }
    
    return "Active";
  };

  const getStatusColor = (player: Player, isCurrentTurn: boolean) => {
    if (player.hasFolded) return "bg-red-600";
    if (player.isAllIn) return "bg-yellow-600";
    if (isCurrentTurn) return "bg-green-600";
    return "bg-blue-600";
  };

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
    <div className="h-screen bg-green-800 relative overflow-hidden">
      {/* 왼쪽 플레이어 (W) - 시계방향 첫번째 */}
      {otherPlayers[0] && (
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-20">
          {renderPlayerCard(otherPlayers[0], true)}
        </div>
      )}

      {/* 상단 중앙 플레이어 (E) - 시계방향 두번째 */}
      {otherPlayers[1] && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 w-20">
          {renderPlayerCard(otherPlayers[1], true)}
        </div>
      )}

      {/* 오른쪽 위 플레이어 (R) - 시계방향 세번째 */}
      {otherPlayers[2] && (
        <div className="absolute right-4 top-4 w-20">
          {renderPlayerCard(otherPlayers[2], true)}
        </div>
      )}

      {/* 오른쪽 플레이어 (T) - 시계방향 네번째 */}
      {otherPlayers[3] && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 w-20">
          {renderPlayerCard(otherPlayers[3], true)}
        </div>
      )}

      {/* 커뮤니티 카드 (상단 중앙) */}
      <div className="absolute top-[20%] left-1/2 transform -translate-x-1/2 text-center">
        {/* 커뮤니티 카드 (세로 배치) */}
        <div className="mb-4">
          <div className="text-white text-sm mb-2">Community Cards</div>
          <div className="flex flex-col space-y-1 items-center">
            {/* 첫 3장 */}
            <div className="flex space-x-1">
              {Array.from({ length: 3 }, (_, index) => {
                const card = index < visibleCards ? gameState.communityCards[index] : null;
                return renderCard(card, index);
              })}
            </div>
            {/* 4번째, 5번째 카드 */}
            <div className="flex space-x-1">
              {Array.from({ length: 2 }, (_, index) => {
                const cardIndex = index + 3;
                const card = cardIndex < visibleCards ? gameState.communityCards[cardIndex] : null;
                return renderCard(card, cardIndex);
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 팟 정보 - 파란색 영역 (커뮤니티 카드와 현재 플레이어 사이) */}
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 text-center">
        <div className="bg-black/70 rounded-lg px-3 py-1 mb-2">
          <div className="text-yellow-400 font-bold text-sm">Pot: ${gameState.pot}</div>
          {gameState.sidePots.length > 0 && (
            <div className="text-yellow-300 text-xs">
              Side: {gameState.sidePots.map(sp => `$${sp.amount}`).join(", ")}
            </div>
          )}
        </div>

        {/* 현재 베팅 */}
        {gameState.currentBet > 0 && (
          <div className="bg-red-600/80 rounded-lg px-3 py-1">
            <div className="text-white font-semibold text-sm">Bet: ${gameState.currentBet}</div>
          </div>
        )}
      </div>

      {/* 현재 플레이어 (Q) - 파란색 영역 (중앙) */}
      {currentPlayer && (
        <div className="absolute top-[55%] left-1/2 transform -translate-x-1/2 w-32">
          <div className="bg-gray-800 rounded-lg p-3 ring-2 ring-blue-500">
            <div className="text-center mb-2">
              <div className="text-white font-bold text-sm">{currentPlayer.name}</div>
              <div className="text-green-400 font-bold">${currentPlayer.chips}</div>
              {currentPlayer.currentBet > 0 && (
                <div className="text-orange-400 text-sm">Bet: ${currentPlayer.currentBet}</div>
              )}
            </div>
            
            {/* 현재 플레이어 카드 */}
            <div className="flex space-x-1 justify-center">
              {currentPlayer.cards.map((card, index) => renderCard(card, index))}
            </div>
          </div>
        </div>
      )}

      {/* 베팅 컨트롤 (하단) */}
      <div className="absolute bottom-4 left-4 right-4">
        {children}
      </div>

      {/* 추가 플레이어 (5번째 이상) */}
      {otherPlayers[4] && (
        <div className="absolute bottom-40 left-4 w-20">
          {renderPlayerCard(otherPlayers[4], true)}
        </div>
      )}
    </div>
  );
}
