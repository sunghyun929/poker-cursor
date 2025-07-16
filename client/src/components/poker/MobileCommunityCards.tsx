import React from 'react';
import { Card } from '@shared/schema';

interface MobileCommunityCardsProps {
  cards: Card[];
  stage: string;
}

export default function MobileCommunityCards({ cards, stage }: MobileCommunityCardsProps) {
  const renderCard = (card: Card, index: number) => (
    <div 
      key={index}
      className="w-12 h-16 bg-gradient-to-b from-white to-gray-50 rounded-lg text-black flex flex-col items-center justify-center border border-gray-300 shadow-xl"
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
      key={`hidden-${index}`}
      className="w-12 h-16 bg-gradient-to-b from-blue-900 to-blue-800 rounded-lg flex items-center justify-center border border-blue-700 shadow-xl"
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}
    >
      <div className="text-blue-300 text-lg">🂠</div>
    </div>
  );

  const getVisibleCards = () => {
    // Texas Hold'em card reveal logic
    switch (stage) {
      case 'flop':
        return 3;
      case 'turn':
        return 4;
      case 'river':
      case 'showdown':
        return 5;
      default:
        return 0; // preflop, waiting, ended
    }
  };

  const visibleCardCount = getVisibleCards();

  return (
    <div className="flex flex-col gap-2 justify-center items-center p-3 bg-gradient-to-br from-green-700 to-green-800 rounded-2xl border-2 border-yellow-500 shadow-xl max-w-[200px]">
      {/* First row - 3 cards */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, index) => {
          if (index < visibleCardCount && cards[index]) {
            return renderCard(cards[index], index);
          } else {
            return renderHiddenCard(index);
          }
        })}
      </div>
      {/* Second row - 2 cards */}
      <div className="flex gap-2">
        {Array.from({ length: 2 }).map((_, index) => {
          const cardIndex = index + 3;
          if (cardIndex < visibleCardCount && cards[cardIndex]) {
            return renderCard(cards[cardIndex], cardIndex);
          } else {
            return renderHiddenCard(cardIndex);
          }
        })}
      </div>
    </div>
  );
}