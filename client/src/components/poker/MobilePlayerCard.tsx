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
      className="bg-gradient-to-b from-white to-gray-50 rounded-lg text-black flex flex-col items-center justify-center border border-gray-300 shadow-xl"
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        fontSize: 'var(--text-xs)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.8)'
      }}
    >
      <div className={`font-bold ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-gray-800'}`}
           style={{ fontSize: 'var(--text-xs)' }}>
        {card.rank}
      </div>
      <div className={`${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-500' : 'text-gray-800'}`}
           style={{ fontSize: 'var(--text-sm)' }}>
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
      className="bg-gradient-to-b from-blue-900 to-blue-800 rounded-lg flex items-center justify-center border border-blue-700 shadow-xl"
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}
    >
      <div className="text-blue-300" style={{ fontSize: 'var(--text-sm)' }}>🂠</div>
    </div>
  );

  return (
    <div 
      className="absolute flex flex-col items-center" 
      style={{
        ...style, 
        minWidth: 'var(--player-card-min-width)',
        minHeight: 'var(--player-card-min-height)'
      }}
    >
      {/* Player Name & Chips */}
      <div className={`text-center ${isActive ? 'animate-pulse' : ''}`}
           style={{ marginBottom: 'var(--spacing-xs)' }}>
        <div 
          className={`font-semibold rounded ${
            isActive ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-white'
          }`}
          style={{ 
            fontSize: 'var(--text-xs)', 
            padding: 'var(--spacing-xs)'
          }}
        >
          {player.name}
          {isCurrentPlayer && (
            <Eye 
              className="inline ml-1" 
              style={{ 
                width: 'var(--spacing-sm)', 
                height: 'var(--spacing-sm)' 
              }} 
            />
          )}
        </div>
        <div 
          className="font-bold text-white bg-black bg-opacity-50 rounded"
          style={{ 
            fontSize: 'var(--text-xs)', 
            marginTop: 'var(--spacing-xs)',
            padding: 'var(--spacing-xs)'
          }}
        >
          ${player.chips}
        </div>
      </div>

      {/* Cards */}
      {player.cards.length > 0 && (
        <div 
          className="flex justify-center" 
          style={{ 
            gap: 'var(--spacing-xs)', 
            marginBottom: 'var(--spacing-xs)' 
          }}
        >
          {shouldShowCards 
            ? player.cards.map((card, index) => renderCard(card, index))
            : player.cards.map((_, index) => renderHiddenCard(index))
          }
        </div>
      )}

      {/* Current Bet */}
      {player.currentBet > 0 && (
        <div className="text-center">
          <div 
            className="bg-red-600 text-white rounded-full"
            style={{ 
              fontSize: 'var(--text-xs)', 
              padding: 'var(--spacing-xs)'
            }}
          >
            ${player.currentBet}
          </div>
        </div>
      )}

      {/* Status indicators */}
      {player.hasFolded && (
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
          <span 
            className="text-white font-bold"
            style={{ fontSize: 'var(--text-xs)' }}
          >
            FOLD
          </span>
        </div>
      )}
      {player.isAllIn && (
        <div 
          className="absolute bg-red-500 text-white rounded"
          style={{ 
            top: 'calc(-1 * var(--spacing-xs))', 
            right: 'calc(-1 * var(--spacing-xs))',
            fontSize: 'var(--text-xs)', 
            padding: 'var(--spacing-xs)'
          }}
        >
          ALL IN
        </div>
      )}
    </div>
  );
}