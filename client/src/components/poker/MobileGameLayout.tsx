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

  // 내 자신을 제외한 다른 플레이어들
  const otherPlayers = players.filter(p => p.id !== currentPlayerId);
  // 좌우로 균등 분배 (짝수면 반반, 홀수면 좌가 1명 더)
  const half = Math.ceil(otherPlayers.length / 2);
  const leftPlayers = otherPlayers.slice(0, half);
  const rightPlayers = otherPlayers.slice(half);

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
            <span className="text-white text-xs font-medium truncate max-w-[60px]">{player.name}</span>
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
        <Button variant="outline" className="bg-blue-600 text-white rounded shadow hover:bg-blue-700">채팅</Button>
        <Button variant="outline" className="bg-red-600 text-white rounded shadow hover:bg-red-700">Leave</Button>
        <Button variant="outline" className="bg-orange-500 text-white rounded shadow hover:bg-orange-600">게임종료</Button>
      </div>

      {/* 메인 flex row: 좌측 플레이어 / 커뮤니티+나 / 우측 플레이어 */}
      <div className="flex flex-row justify-center items-center h-full w-full">
        {/* 좌측 플레이어들 */}
        <div className="flex flex-col justify-center items-end flex-1 h-full pt-16 pb-40">
          {leftPlayers.map((player) => renderPlayerCard(player))}
        </div>
        {/* 커뮤니티 카드 + 내 UI */}
        <div className="flex flex-col items-center justify-center h-full">
          {/* 커뮤니티 카드 영역을 absolute top-0 left-1/2 translate-x-1/2 mt-1로 위에 거의 딱 붙게 배치 */}
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex flex-col items-center gap-2">
              {Array.from({ length: 5 }, (_, index) => {
                const card = index < visibleCards ? gameState.communityCards[index] : null;
                return renderCard(card, index);
              })}
            </div>
          </div>
          {/* 내 UI (margin-bottom으로 베팅창과 겹침 방지) */}
          {currentPlayer && (
            <div className="mt-0 mb-20 w-full flex justify-center">
              {renderPlayerCard(currentPlayer, true)}
            </div>
          )}
        </div>
        {/* 우측 플레이어들 */}
        <div className="flex flex-col justify-center items-start flex-1 h-full pt-16 pb-40">
          {rightPlayers.map((player) => renderPlayerCard(player))}
        </div>
      </div>

      {/* 베팅 컨트롤 - 하단 고정 */}
      <div className="fixed bottom-2 left-0 right-0 z-30 px-2 bg-black/70 rounded-t-lg py-2">
        {children}
      </div>
    </div>
  );
}
