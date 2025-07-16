import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Crown, Eye, EyeOff } from "lucide-react";
import type { Player } from "@shared/schema";

interface PlayerSeatProps {
  player: Player;
  isCurrentTurn: boolean;
  isCurrentPlayer: boolean;
  isDealer: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
  gameStage: string;
  showAllHoleCards?: boolean;
}

export default function PlayerSeat({
  player,
  isCurrentTurn,
  isCurrentPlayer,
  isDealer,
  isSmallBlind,
  isBigBlind,
  gameStage,
  showAllHoleCards = false
}: PlayerSeatProps) {
  const getPlayerStatus = () => {
    if (player.hasFolded) return "Folded";
    if (player.isAllIn) return "All In";
    if (isCurrentTurn) return "Thinking...";
    
    // Show specific last action instead of generic "Acted"
    if (player.hasActed && player.lastAction && gameStage !== 'waiting') {
      switch (player.lastAction.type) {
        case 'check': return "Checked";
        case 'call': return `Called $${player.lastAction.amount}`;
        case 'bet': return `Bet $${player.lastAction.amount}`;
        case 'raise': return `Raised $${player.lastAction.amount}`;
        case 'allIn': return `All In ($${player.lastAction.amount})`;
        default: return "Acted";
      }
    }
    
    return "Active";
  };

  const getStatusColor = () => {
    if (player.hasFolded) return "bg-red-600";
    if (player.isAllIn) return "bg-yellow-600";
    if (isCurrentTurn) return "bg-green-600";
    return "bg-blue-600";
  };

  const renderCard = (cardIndex: number) => {
    const hasCard = player.cards && player.cards[cardIndex];
    
    // Show cards if:
    // 1. Current player (always can see own cards unless folded)
    // 2. All hole cards should be shown AND player hasn't folded
    const canSeeOwnCards = isCurrentPlayer && !player.hasFolded;
    const allCardsRevealed = showAllHoleCards && !player.hasFolded;
    const showCard = (canSeeOwnCards || allCardsRevealed) && hasCard && gameStage !== 'waiting' && gameStage !== 'ended';
    
    // Don't render cards if game is in waiting state and player has no cards
    if (gameStage === 'waiting' && (!player.cards || player.cards.length === 0)) {
      return null;
    }
    
    return (
      <div 
        key={cardIndex}
        className={`poker-card w-8 h-12 flex items-center justify-center text-xs font-bold ${
          showCard ? 'bg-white border-2 border-gray-300' : 'face-down'
        } ${gameStage !== 'waiting' && hasCard ? 'card-animate-deal' : ''}`}
        style={{ animationDelay: `${cardIndex * 0.1}s` }}
      >
        {showCard ? (
          <div className={`text-center ${hasCard.suit === 'hearts' || hasCard.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
            <div className="text-[10px] font-bold">{hasCard.rank}</div>
            <div className={`text-xs leading-none font-bold ${
              hasCard.suit === 'hearts' || hasCard.suit === 'diamonds' ? 'text-red-600' : 
              hasCard.suit === 'spades' ? 'text-blue-900' : 'text-green-800'
            }`}>
              {hasCard.suit === 'hearts' && '♥'}
              {hasCard.suit === 'diamonds' && '♦'}
              {hasCard.suit === 'clubs' && '♣'}
              {hasCard.suit === 'spades' && '♠'}
            </div>
          </div>
        ) : hasCard ? (
          <div className="text-white text-lg">🂠</div>
        ) : (
          <div className="border-2 border-dashed border-gray-400 w-full h-full rounded"></div>
        )}
      </div>
    );
  };

  return (
    <div className={`player-seat ${isCurrentTurn ? 'active' : ''}`}>
      <Card className={`p-4 min-w-[168px] ${isCurrentPlayer ? 'ring-2 ring-blue-500' : ''} ${
        player.hasFolded ? 'opacity-50' : ''
      }`}>
        {/* Player Info */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1">
            <User className="h-4 w-4" />
            <span className="font-semibold text-sm truncate max-w-[80px]">
              {player.name}
            </span>
          </div>
          
          {/* Position Indicators */}
          <div className="flex space-x-1">
            {isDealer && (
              <Badge variant="outline" className="text-xs p-1">
                <Crown className="h-3 w-3" />
              </Badge>
            )}
            {isSmallBlind && (
              <Badge variant="secondary" className="text-xs">SB</Badge>
            )}
            {isBigBlind && (
              <Badge variant="secondary" className="text-xs">BB</Badge>
            )}
          </div>
        </div>

        {/* Cards */}
        <div className="flex space-x-1 mb-2 justify-center">
          {renderCard(0)}
          {renderCard(1)}
        </div>

        {/* Chips */}
        <div className="text-center mb-2">
          <div className="font-bold text-green-600">${player.chips}</div>
          {player.currentBet > 0 && (
            <div className="text-sm text-orange-600">Bet: ${player.currentBet}</div>
          )}
        </div>

        {/* Status */}
        <div className="text-center">
          <Badge 
            className={`text-xs ${getStatusColor()} text-white`}
          >
            {getPlayerStatus()}
          </Badge>
        </div>

        {/* Current Player Indicator */}
        {isCurrentPlayer && (
          <div className="absolute -top-2 -right-2 bg-blue-500 rounded-full p-1">
            <Eye className="h-3 w-3 text-white" />
          </div>
        )}
      </Card>

      {/* Betting Chips Animation */}
      {player.currentBet > 0 && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 pot-chips">
          <div className="flex space-x-1">
            {/* Render poker chips based on bet amount */}
            {Array.from({ length: Math.min(Math.floor(player.currentBet / 25) + 1, 5) }).map((_, i) => (
              <div 
                key={i}
                className="poker-chip w-4 h-4 red"
                style={{ zIndex: 10 + i }}
              />
            ))}
          </div>
          <div className="text-white text-xs text-center mt-1 bg-black/50 rounded px-1">
            ${player.currentBet}
          </div>
        </div>
      )}
    </div>
  );
}
