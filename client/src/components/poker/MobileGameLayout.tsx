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
  const players = gameState.players;
  const myIndex = players.findIndex(p => p.id === currentPlayerId);
  const playerCount = players.length;

  // 시계방향 플레이어 분배: 내 위(0), 좌(1), 우(2), 아래(3,4,...)
  const getPlayerByOffset = (offset: number) => players[(myIndex + offset + playerCount) % playerCount];
  const leftPlayer = playerCount > 1 ? getPlayerByOffset(1) : null;
  const rightPlayer = playerCount > 2 ? getPlayerByOffset(-1) : null;
  const bottomPlayers = [];
  for (let i = 2; i < playerCount; i++) {
    const idx = (myIndex + i) % playerCount;
    if (players[idx].id !== currentPlayerId && players[idx].id !== leftPlayer?.id && players[idx].id !== rightPlayer?.id) {
      bottomPlayers.push(players[idx]);
    }
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
      <div key={index} className="w-12 h-16 bg-white rounded-md border border-gray-300 flex flex-col items-center justify-center shadow-sm">
        <div className={`font-bold text-xs ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}>{card.rank}</div>
        <div className={`text-lg font-bold ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : card.suit === 'spades' ? 'text-blue-900' : 'text-green-800'}`}>{card.suit === 'hearts' && '♥'}{card.suit === 'diamonds' && '♦'}{card.suit === 'clubs' && '♣'}{card.suit === 'spades' && '♠'}</div>
      </div>
    );
  };

  const renderPlayerCard = (player: Player, compact = false) => {
    if (!player) return null;
    const isCurrentTurn = gameState.currentPlayerIndex === players.findIndex(p => p.id === player.id);
    const isDealer = gameState.dealerPosition === players.findIndex(p => p.id === player.id);
    const isSmallBlind = gameState.smallBlindPosition === players.findIndex(p => p.id === player.id);
    const isBigBlind = gameState.bigBlindPosition === players.findIndex(p => p.id === player.id);
    return (
      <div className={`bg-gray-800 rounded-lg p-2 shadow-md min-w-[70px] max-w-[90px] mx-auto ${isCurrentTurn ? 'ring-2 ring-yellow-400' : ''} ${player.hasFolded ? 'opacity-50' : ''}`}> 
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1">
            <User className="h-3 w-3 text-white" />
            <span className="text-white text-xs font-medium truncate max-w-[60px]">{player.name}</span>
          </div>
          <div className="flex space-x-1">
            {isDealer && <Badge variant="outline" className="text-xs p-0.5 h-4"><Crown className="h-2 w-2" /></Badge>}
            {isSmallBlind && <Badge variant="secondary" className="text-xs p-0.5 h-4">SB</Badge>}
            {isBigBlind && <Badge variant="secondary" className="text-xs p-0.5 h-4">BB</Badge>}
          </div>
        </div>
        <div className="flex space-x-1 mb-1 justify-center">
          {player.cards.map((card, index) => renderCard(card, index))}
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
        <Button variant="outline">채팅</Button>
        <Button variant="outline">Leave</Button>
        <Button variant="outline">게임종료</Button>
      </div>

      {/* 내 플레이어(커뮤니티 카드 위) */}
      {currentPlayer && (
        <div className="absolute top-[10%] left-1/2 transform -translate-x-1/2 z-20">
          {renderPlayerCard(currentPlayer)}
        </div>
      )}

      {/* 커뮤니티 카드 & 좌우 플레이어 */}
      <div className="absolute top-[28%] left-1/2 transform -translate-x-1/2 w-full flex flex-row items-center justify-center z-10">
        {/* 좌측 플레이어 */}
        <div className="flex-1 flex justify-end pr-2">
          {leftPlayer && renderPlayerCard(leftPlayer, true)}
        </div>
        {/* 커뮤니티 카드 */}
        <div className="flex flex-col items-center">
          <div className="flex flex-row space-x-2 mb-2">
            {Array.from({ length: 5 }, (_, index) => {
              const card = index < visibleCards ? gameState.communityCards[index] : null;
              return renderCard(card, index);
            })}
          </div>
        </div>
        {/* 우측 플레이어 */}
        <div className="flex-1 flex justify-start pl-2">
          {rightPlayer && renderPlayerCard(rightPlayer, true)}
        </div>
      </div>

      {/* 커뮤니티 카드 아래(아래쪽 플레이어들) */}
      <div className="absolute top-[48%] left-1/2 transform -translate-x-1/2 w-10/12 flex flex-row items-start justify-center gap-2 z-10">
        {bottomPlayers.map((player, idx) => (
          <div key={player.id}>{renderPlayerCard(player, true)}</div>
        ))}
      </div>

      {/* Pot, Current Bet */}
      <div className="absolute top-[62%] left-1/2 transform -translate-x-1/2 text-center z-20 w-full">
        <div className="inline-block bg-black/70 rounded-lg px-4 py-1 mb-2 shadow">
          <span className="text-yellow-400 font-bold text-base mr-4">Pot: ${gameState.pot}</span>
          {gameState.currentBet > 0 && <span className="text-red-400 font-bold text-base">Current Bet: ${gameState.currentBet}</span>}
        </div>
      </div>

      {/* 베팅 컨트롤 - 하단 고정 */}
      <div className="fixed bottom-2 left-0 right-0 z-30 px-2 bg-black/70 rounded-t-lg py-2">
        {children}
      </div>
    </div>
  );
}
