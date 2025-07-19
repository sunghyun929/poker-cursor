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
        <div key={`empty-${index}`} className="poker-card bg-gray-400 border-2 border-dashed border-gray-500 flex items-center justify-center">
          <div className="text-gray-600" style={{fontSize: 'var(--text-xs)'}}>?</div>
        </div>
      );
    }
    return (
      <div key={index} className="poker-card bg-white flex flex-col items-center justify-center">
        <div 
          className={`font-bold ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-black'}`}
          style={{fontSize: 'var(--text-xs)'}}
        >
          {card.rank}
        </div>
        <div 
          className={`font-bold ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : card.suit === 'spades' ? 'text-blue-900' : 'text-green-800'}`}
          style={{fontSize: 'var(--text-sm)'}}
        >
          {card.suit === 'hearts' && '♥'}
          {card.suit === 'diamonds' && '♦'}
          {card.suit === 'clubs' && '♣'}
          {card.suit === 'spades' && '♠'}
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
    <div 
      className="h-screen bg-green-800 overflow-hidden font-sans mobile-poker-grid"
      style={{
        display: 'grid',
        gridTemplate: `
          'header header header header' 8vh
          'p4 p4 p4 p4' 14vh  
          'p3 . . p5' 14vh
          'community community community community' 16vh
          'p2 . . p6' 14vh
          'p1 p1 p1 p1' 14vh
          'controls controls controls controls' 20vh
        / 20% 30% 30% 20%`,
        gap: 'var(--spacing-xs)',
        padding: 'var(--spacing-xs)'
      }}
    >
      {/* 상단 헤더 영역 - Grid Area: header */}
      <div 
        className="flex justify-between items-center z-30"
        style={{ gridArea: 'header' }}
      >
        {/* 좌측: 채팅 버튼 */}
        <div className="relative">
          <Button 
            variant="outline" 
            className="bg-blue-600 text-white rounded shadow hover:bg-blue-700"
            style={{ fontSize: 'var(--text-xs)', padding: 'var(--spacing-xs)' }}
            onClick={onOpenChat}
          >
            채팅
          </Button>
          {unreadCount && unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center font-bold"
                 style={{ 
                   fontSize: 'var(--text-xs)', 
                   width: 'var(--spacing-md)', 
                   height: 'var(--spacing-md)' 
                 }}>
              {unreadCount}
            </div>
          )}
        </div>

        {/* 중앙: 게임종료 버튼 (방장만) */}
        {gameState.hostPlayerId === currentPlayerId && gameState.stage !== 'waiting' && onEndGame && (
          <Button 
            variant="outline" 
            className="bg-orange-500 text-white rounded shadow hover:bg-orange-600"
            style={{ fontSize: 'var(--text-xs)', padding: 'var(--spacing-xs)' }}
            onClick={onEndGame}
          >
            게임종료
          </Button>
        )}

        {/* Start Game 버튼 (대기 중일 때만) */}
        {gameState.stage === 'waiting' && gameState.players.length >= 2 && gameState.hostPlayerId === currentPlayerId && onStartGame && (
          <Button 
            variant="outline" 
            className="bg-green-600 text-white rounded shadow hover:bg-green-700"
            style={{ fontSize: 'var(--text-sm)', padding: 'var(--spacing-sm)' }}
            onClick={onStartGame}
          >
            Start Game
          </Button>
        )}

        {/* 우측: Leave 버튼 */}
        <Button 
          variant="outline" 
          className="bg-red-600 text-white rounded shadow hover:bg-red-700"
          style={{ fontSize: 'var(--text-xs)', padding: 'var(--spacing-xs)' }}
          onClick={onLeaveGame}
        >
          Leave
        </Button>
      </div>

      {/* 커뮤니티 카드 영역 - Grid Area: community */}
      <div 
        className="flex flex-col items-center justify-center z-20"
        style={{ gridArea: 'community' }}
      >
        {/* 커뮤니티 카드 */}
        <div className="flex gap-1 mb-2">
          {Array.from({ length: 5 }, (_, index) => {
            const card = index < visibleCards ? gameState.communityCards[index] : null;
            return renderCard(card, index);
          })}
        </div>
        
        {/* 팟 정보 */}
        <div className="flex flex-col items-center gap-1">
          <div 
            className="text-white bg-black/70 rounded-full font-medium text-center px-2 py-1"
            style={{ fontSize: 'var(--text-xs)' }}
          >
            Pot: ${gameState.pot}
          </div>
          {gameState.currentBet > 0 && (
            <div 
              className="text-orange-200 bg-orange-600/80 rounded-full font-medium text-center px-2 py-1"
              style={{ fontSize: 'var(--text-xs)' }}
            >
              Current Bet: ${gameState.currentBet}
            </div>
          )}
        </div>
      </div>

      {/* 베팅 컨트롤 영역 - Grid Area: controls */}
      <div 
        className="z-30 bg-black/70 rounded-lg flex items-center justify-center"
        style={{ 
          gridArea: 'controls',
          padding: 'var(--spacing-sm)'
        }}
      >
        {children}
      </div>
    </div>
  );
}
