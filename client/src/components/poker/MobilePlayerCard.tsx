import React from 'react';
import { Player, Card } from '@shared/schema';
import { Eye } from 'lucide-react';

interface MobilePlayerCardProps {
  player: Player;
  isCurrentPlayer: boolean;
  isActive: boolean;
  style: React.CSSProperties;
  gameStage: string;
  showAllHoleCards?: boolean;
}

export default function MobilePlayerCard({ player, isCurrentPlayer, isActive, style, gameStage, showAllHoleCards }: MobilePlayerCardProps) {
  const shouldShowCards = isCurrentPlayer || showAllHoleCards || gameStage === 'showdown';
  
  const renderCard = (card: Card, index: number) => (
    <div 
      key={index}
      className="w-10 h-14 bg-gradient-to-b from-white to-gray-50 rounded-lg text-black flex flex-col items-center justify-center border border-gray-300 shadow-xl"
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
      <div className={`font-bold text-sm ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-gray-800'}`}>
        {card.rank}
      </div>
      <div className={`text-lg ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-gray-800'}`}>
        {card.suit === 'hearts' && '♥'}
        {card.suit === 'diamonds' && '♦'}
        {card.suit === 'clubs' && '♣'}
        {card.suit === 'spades' && '♠'}
      </div>
    </div>
  );

  const renderHiddenCard = (index: number) => (
    <div 
      key={index}
      className="w-10 h-14 bg-gradient-to-b from-blue-900 to-blue-800 rounded-lg flex items-center justify-center border border-blue-700 shadow-xl"
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}
    >
      <div className="text-blue-300 text-lg">🂠</div>
    </div>
  );

  return (
    <div className="absolute min-w-[80px] min-h-[100px]" style={{...style, outline: '2px solid red'}}>
      {/* Player Name & Chips */}
      <div className={`text-center mb-1 ${isActive ? 'animate-pulse' : ''}`}>
        <div className={`text-sm font-semibold px-2 py-1 rounded ${
          isActive ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-white'
        }`}>
          {player.name}
          {isCurrentPlayer && <Eye className="inline ml-1 h-3 w-3" />}
        </div>
        <div className="text-sm font-bold text-white mt-1 bg-black bg-opacity-50 rounded px-2 py-1">
          ${player.chips}
        </div>
      </div>

      {/* Cards */}
      {player.cards.length > 0 && (
        <div className="flex gap-1 justify-center mb-1">
          {shouldShowCards 
            ? player.cards.map((card, index) => renderCard(card, index))
            : player.cards.map((_, index) => renderHiddenCard(index))
          }
        </div>
      )}

      {/* Current Bet */}
      {player.currentBet > 0 && (
        <div className="text-center">
          <div className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
            ${player.currentBet}
          </div>
        </div>
      )}

      {/* Status indicators */}
      {player.hasFolded && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
          <span className="text-white text-xs font-bold">FOLD</span>
        </div>
      )}
      {player.isAllIn && (
        <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1 rounded">
          ALL IN
        </div>
      )}
    </div>
  );
}