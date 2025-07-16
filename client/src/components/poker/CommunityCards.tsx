import type { Card } from "@shared/schema";

interface CommunityCardsProps {
  cards: Card[];
  stage: string;
  isMobile?: boolean;
}

export default function CommunityCards({ cards, stage, isMobile = false }: CommunityCardsProps) {
  const getCardDisplay = (card: Card) => {
    const suitSymbol = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠'
    }[card.suit];
    
    const color = card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black';
    
    return (
      <div className={`${color} text-center`}>
        <div className="text-lg font-bold">{card.rank}</div>
        <div className="text-2xl leading-none">{suitSymbol}</div>
      </div>
    );
  };

  const renderCard = (index: number) => {
    const card = cards[index];
    let shouldShow = false;
    
    // 텍사스 홀덤 규칙에 따른 카드 공개 - preflop에서는 커뮤니티 카드 숨김
    if (stage === 'flop' && index < 3) {
      shouldShow = true;
    } else if (stage === 'turn' && index < 4) {
      shouldShow = true;
    } else if (stage === 'river' && index < 5) {
      shouldShow = true;
    } else if (stage === 'showdown' && index < 5) {
      shouldShow = true;
    } else if (stage === 'preflop' || stage === 'waiting') {
      shouldShow = false; // preflop과 waiting에서는 커뮤니티 카드 표시 안함
    }

    return (
      <div
        key={index}
        className={`poker-card flex items-center justify-center ${
          shouldShow && card ? 'bg-white card-animate-flip' : 'face-down'
        } w-16 h-24`}
        style={{ animationDelay: `${index * 0.2}s` }}
      >
        {shouldShow && card ? (
          getCardDisplay(card)
        ) : (
          <div className="text-white text-2xl">🂠</div>
        )}
      </div>
    );
  };

  // 대기 중에는 커뮤니티 카드를 표시하지 않음
  if (stage === 'waiting') {
    return null;
  }

  // 프리플랍에는 모든 카드가 뒤집어져 있음
  if (stage === 'preflop') {
    return (
      <div className="flex space-x-2">
        {[0, 1, 2, 3, 4].map(index => (
          <div key={index} className="poker-card face-down flex items-center justify-center w-16 h-24">
            <div className="text-white text-2xl">🂠</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex space-x-2">
      {[0, 1, 2, 3, 4].map(renderCard)}
    </div>
  );
}
