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
      {/* 상단 버튼들 - 확정된 레이아웃에 맞게 배치 */}
      <div className="absolute top-2 left-0 right-0 z-[9999] flex justify-between items-start px-2" style={{outline: '2px solid blue'}}>
        {/* 좌측: 채팅 버튼 (0-18%, 0-8%) */}
        <div className="relative min-w-[60px]" style={{outline: '1px solid yellow'}}>
          <Button 
            variant="outline" 
            className="bg-blue-600 text-white rounded shadow hover:bg-blue-700 text-xs px-2 py-1"
            onClick={onOpenChat}
          >
            채팅
          </Button>
          {unreadCount && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {unreadCount}
            </div>
          )}
        </div>

        {/* 중앙: 게임종료 버튼 (20-40%, 0-8%) - 방장만 */}
        {gameState.hostPlayerId === currentPlayerId && gameState.stage !== 'waiting' && onEndGame && (
          <div className="min-w-[80px]" style={{outline: '1px solid orange'}}>
            <Button 
              variant="outline" 
              className="bg-orange-500 text-white rounded shadow hover:bg-orange-600 text-xs px-2 py-1"
              onClick={onEndGame}
            >
              게임종료
            </Button>
          </div>
        )}

        {/* 우측: Leave 버튼 (82-100%, 0-8%) */}
        <div className="min-w-[60px]" style={{outline: '1px solid green'}}>
          <Button 
            variant="outline" 
            className="bg-red-600 text-white rounded shadow hover:bg-red-700 text-xs px-2 py-1"
            onClick={onLeaveGame}
          >
            Leave
          </Button>
        </div>
      </div>

      {/* Start Game 버튼 - 별도 위치 (대기 중일 때만) */}
      {gameState.stage === 'waiting' && gameState.players.length >= 2 && gameState.hostPlayerId === currentPlayerId && onStartGame && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-[9999]">
          <Button 
            variant="outline" 
            className="bg-green-600 text-white rounded shadow hover:bg-green-700"
            onClick={onStartGame}
          >
            Start Game
          </Button>
        </div>
      )}

      {/* 중앙 커뮤니티 카드 영역 - 35-55% 영역에 배치 */}
      <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-5 min-w-[250px] min-h-[80px]" style={{outline: '2px solid purple'}}>
        <div className="flex flex-col items-center gap-3">
          {/* 커뮤니티 카드 */}
          <div className="flex gap-1">
            {Array.from({ length: 5 }, (_, index) => {
              const card = index < visibleCards ? gameState.communityCards[index] : null;
              return renderCard(card, index);
            })}
          </div>
          
          {/* 팟 정보 */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-white text-sm bg-black/70 px-3 py-1 rounded-full font-medium">
              Pot: ${gameState.pot}
            </div>
            {gameState.currentBet > 0 && (
              <div className="text-orange-200 text-sm bg-orange-600/80 px-3 py-1 rounded-full font-medium">
                Current Bet: ${gameState.currentBet}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 베팅 컨트롤 - 하단 고정, 좌우 여백 확보 */}
      <div className="fixed bottom-2 left-4 right-4 z-30 px-2 bg-black/70 rounded-lg py-2 min-h-[80px]" style={{outline: '2px solid cyan'}}>
        {children}
      </div>
    </div>
  );
}
