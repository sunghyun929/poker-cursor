import { useEffect, useState } from "react";
import { Trophy, Coins, Check, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GameState } from "@shared/schema";

interface WinnerDisplayProps {
  gameState: GameState;
  currentPlayerId: string;
  onConfirm: () => void;
  onIncreaseBlind: (newBigBlind?: number) => void;
  onStartNextHand: () => void;
}

export default function WinnerDisplay({ gameState, currentPlayerId, onConfirm, onIncreaseBlind, onStartNextHand }: WinnerDisplayProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [isDimmed, setIsDimmed] = useState(false);

  useEffect(() => {
    if (gameState.lastAction && (
      gameState.lastAction.action.includes('wins') || 
      gameState.lastAction.action.includes('split') ||
      gameState.lastAction.action.includes('win by fold')
    )) {
      setIsVisible(true);
      setHasConfirmed(false);
      setCountdown(15);
      
      // Countdown timer
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-hide after 15 seconds if not all players confirmed
      const timer = setTimeout(() => {
        setIsVisible(false);
        setHasConfirmed(false);
        setCountdown(15);
        // Automatically start next hand when timer expires
        onStartNextHand();
      }, 15000);
      
      return () => {
        clearTimeout(timer);
        clearInterval(countdownInterval);
      };
    } else {
      setIsVisible(false);
      setHasConfirmed(false);
      setCountdown(15);
    }
  }, [gameState.lastAction]);

  // Reset confirmation when winnerConfirmations is reset
  useEffect(() => {
    if (!gameState.winnerConfirmations || gameState.winnerConfirmations.length === 0) {
      setHasConfirmed(false);
    }
  }, [gameState.winnerConfirmations]);

  // Dim the display when blind increase prompt is shown
  useEffect(() => {
    setIsDimmed(gameState.blindIncrease?.pending || false);
  }, [gameState.blindIncrease?.pending]);

  const handleConfirm = () => {
    if (!hasConfirmed && !isCurrentPlayerConfirmed) {
      setHasConfirmed(true);
      onConfirm();
    }
  };

  const handleIncreaseBlind = () => {
    // Trigger blind increase prompt by calling without parameters
    onIncreaseBlind();
    // 블라인드 인상 후에도 확인 버튼을 눌러야만 다음 라운드로 넘어가도록 변경
    // (onStartNextHand는 onConfirm에서만 호출)
  };

  // Check if current player has already confirmed
  const isCurrentPlayerConfirmed = gameState.winnerConfirmations?.includes(currentPlayerId) || hasConfirmed;
  
  // Calculate how many players have confirmed (only count active players with chips > 0)
  const confirmedCount = gameState.winnerConfirmations?.length || 0;
  const activePlayers = gameState.players.filter(p => p.chips > 0);
  const totalPlayers = activePlayers.length;

  // Check if current player is the host
  const isHost = gameState.hostPlayerId === currentPlayerId;
  
  // Check if current player is eliminated (has no chips)
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const isEliminated = !currentPlayer || currentPlayer.chips === 0;

  if (!isVisible || !gameState.lastAction) {
    return null;
  }

  const isWin = gameState.lastAction.action.includes('wins');
  const isSplit = gameState.lastAction.action.includes('split');
  const isFoldWin = gameState.lastAction.action.includes('win by fold');

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isDimmed ? 'opacity-30' : 'opacity-100'}`}>
      <div className={`
        animate-in zoom-in-50 duration-500 
        bg-gradient-to-br ${isWin ? 'from-yellow-400 to-yellow-600' : 'from-blue-400 to-blue-600'} 
        rounded-2xl p-4 md:p-6 text-center shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto
        border-4 ${isWin ? 'border-yellow-300' : 'border-blue-300'}
      `}>
        <div className="flex justify-center mb-4">
          {isWin ? (
            <Trophy className="h-16 w-16 text-yellow-900 animate-bounce" />
          ) : (
            <Coins className="h-16 w-16 text-blue-900 animate-pulse" />
          )}
        </div>
        
        <h2 className={`text-2xl font-bold mb-2 ${(isWin || isFoldWin) ? 'text-yellow-900' : 'text-blue-900'}`}>
          {(isWin || isFoldWin) ? '🎉 Winner!' : '🤝 Split Pot!'}
        </h2>
        
        <div className={`text-lg font-semibold mb-2 ${(isWin || isFoldWin) ? 'text-yellow-800' : 'text-blue-800'}`}>
          {gameState.players.find(p => p.id === gameState.lastAction?.playerId)?.name || gameState.lastAction?.playerId}
        </div>
        
        <div className={`text-sm mb-3 ${(isWin || isFoldWin) ? 'text-yellow-700' : 'text-blue-700'}`}>
          {isFoldWin ? '모든 상대가 폴드하여 승리!' : gameState.lastAction?.action}
        </div>

        {/* Show showdown hands if multiple players made it to showdown */}
        {gameState.showdownHands && gameState.showdownHands.length > 1 && (
          <div className="mb-4 max-h-60 overflow-y-auto">
            <div className="text-sm font-semibold mb-3 text-white">쇼다운 결과:</div>
            <div className="space-y-4">
              {gameState.showdownHands
                .sort((a, b) => {
                  // Sort by winner first, then by hand rank (lower rank number = better hand)
                  if (a.isWinner && !b.isWinner) return -1;
                  if (!a.isWinner && b.isWinner) return 1;
                  return a.hand.rank - b.hand.rank;
                })
                .map((showdownHand, playerIndex) => (
                <div key={playerIndex} className={`p-4 rounded-lg ${showdownHand.isWinner ? 'bg-yellow-500/20 border-2 border-yellow-300' : 'bg-gray-600/20 border border-gray-400'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`text-lg font-bold ${showdownHand.isWinner ? 'text-yellow-200' : 'text-gray-200'}`}>
                      {playerIndex + 1}등: {showdownHand.playerName} {showdownHand.isWinner ? '🏆' : ''}
                      {showdownHand.totalWinnings && showdownHand.totalWinnings > 0 && (
                        <span className="ml-2 text-green-300 font-bold">+${showdownHand.totalWinnings}</span>
                      )}
                    </div>
                    <div className="text-sm text-white bg-black/40 rounded px-3 py-1">
                      {showdownHand.hand.description}
                    </div>
                  </div>
                  
                  {/* Mobile responsive cards display */}
                  <div className="flex justify-center items-center gap-4 md:gap-6">
                    {/* Player's hole cards (2 cards) */}
                    {showdownHand.holeCards && showdownHand.holeCards.length === 2 && (
                      <div className="flex-1 max-w-[120px]">
                        <div className="text-xs text-gray-300 mb-1 text-center">홀 카드 (2장)</div>
                        <div className="flex gap-1 justify-center">
                          {showdownHand.holeCards.map((card, cardIndex) => (
                            <div key={cardIndex} className="w-10 h-6 md:w-12 md:h-8 bg-white rounded text-black text-xs flex items-center justify-center border-2 border-blue-400">
                              <div className={`font-bold text-[10px] md:text-xs ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
                                {card.rank}
                              </div>
                              <div className={`ml-0.5 text-[10px] md:text-xs font-bold ${
                                card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 
                                card.suit === 'spades' ? 'text-blue-900' : 'text-green-800'
                              }`}>
                                {card.suit === 'hearts' && '♥'}
                                {card.suit === 'diamonds' && '♦'}
                                {card.suit === 'clubs' && '♣'}
                                {card.suit === 'spades' && '♠'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Best hand composition (5 cards) */}
                    <div className="flex-1 max-w-[250px]">
                      <div className="text-xs text-gray-300 mb-1 text-center">최고 패 (5장)</div>
                      <div className="hidden md:flex gap-1 justify-center">
                        {showdownHand.hand.cards.map((card, cardIndex) => (
                          <div key={cardIndex} className="w-12 h-8 bg-white rounded text-black text-xs flex items-center justify-center border border-gray-300">
                            <div className={`font-bold text-xs ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
                              {card.rank}
                            </div>
                            <div className={`ml-0.5 text-xs font-bold ${
                              card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 
                              card.suit === 'spades' ? 'text-blue-900' : 'text-green-800'
                            }`}>
                              {card.suit === 'hearts' && '♥'}
                              {card.suit === 'diamonds' && '♦'}
                              {card.suit === 'clubs' && '♣'}
                              {card.suit === 'spades' && '♠'}
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Mobile: 3+2 layout for 5 cards */}
                      <div className="md:hidden space-y-1">
                        <div className="flex gap-1 justify-center">
                          {showdownHand.hand.cards.slice(0, 3).map((card, cardIndex) => (
                            <div key={cardIndex} className="w-10 h-6 bg-white rounded text-black text-xs flex items-center justify-center border border-gray-300">
                              <div className={`font-bold text-[10px] ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
                                {card.rank}
                              </div>
                              <div className={`ml-0.5 text-[10px] font-bold ${
                                card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 
                                card.suit === 'spades' ? 'text-blue-900' : 'text-green-800'
                              }`}>
                                {card.suit === 'hearts' && '♥'}
                                {card.suit === 'diamonds' && '♦'}
                                {card.suit === 'clubs' && '♣'}
                                {card.suit === 'spades' && '♠'}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-1 justify-center">
                          {showdownHand.hand.cards.slice(3, 5).map((card, cardIndex) => (
                            <div key={cardIndex + 3} className="w-10 h-6 bg-white rounded text-black text-xs flex items-center justify-center border border-gray-300">
                              <div className={`font-bold text-[10px] ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
                                {card.rank}
                              </div>
                              <div className={`ml-0.5 text-[10px] font-bold ${
                                card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 
                                card.suit === 'spades' ? 'text-blue-900' : 'text-green-800'
                              }`}>
                                {card.suit === 'hearts' && '♥'}
                                {card.suit === 'diamonds' && '♦'}
                                {card.suit === 'clubs' && '♣'}
                                {card.suit === 'spades' && '♠'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Show single winning hand for non-showdown wins */}
        {!gameState.showdownHands && gameState.lastAction?.winningHand && (
          <div className="mb-3">
            <div className="text-sm font-semibold mb-2 text-white">승리 패 (5장):</div>
            <div className="flex justify-center gap-1 mb-2">
              {gameState.lastAction?.winningHand?.cards.map((card, index) => (
                <div key={index} className="w-12 h-8 bg-white rounded text-black text-xs flex items-center justify-center border-2 border-gray-300">
                  <div className={`font-bold ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
                    {card.rank}
                  </div>
                  <div className={`ml-1 ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
                    {card.suit === 'hearts' && '♥'}
                    {card.suit === 'diamonds' && '♦'}
                    {card.suit === 'clubs' && '♣'}
                    {card.suit === 'spades' && '♠'}
                  </div>
                </div>
              ))}
            </div>
            <div className="text-sm font-bold text-white bg-black/30 rounded px-2 py-1">
              {gameState.lastAction?.winningHand?.description}
            </div>
          </div>
        )}
        
        <div className={`
          text-3xl font-bold flex items-center justify-center gap-2 mb-4
          ${isWin ? 'text-yellow-900' : 'text-blue-900'}
        `}>
          <Coins className="h-8 w-8" />
          ${(() => {
            // Display total pot size (sum of all winnings distributed)
            if (gameState.showdownHands && gameState.showdownHands.length > 0) {
              const totalPotSize = gameState.showdownHands
                .reduce((sum, hand) => sum + (hand.totalWinnings || 0), 0);
              return totalPotSize > 0 ? totalPotSize : (gameState.lastAction?.amount || 0);
            }
            // Fallback to lastAction amount (total pot size)
            return gameState.lastAction?.amount || 0;
          })()}
        </div>
        
        {/* Confirm button and status */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm text-white/70">
              {confirmedCount}/{totalPlayers} 명 확인됨
            </div>
            <div className="text-sm text-white/70">
              {countdown > 0 ? `${countdown}초 후 자동 진행` : '자동 진행'}
            </div>
          </div>
          
          {/* Show buttons only for active players */}
          {!isEliminated ? (
            // Show status message if all players confirmed
            confirmedCount === totalPlayers ? (
              <div className="text-center text-green-300 text-sm py-4">
                모든 플레이어가 확인했습니다. 곧 다음 핸드가 시작됩니다.
              </div>
            ) : (
              // Show confirm button if not all players confirmed yet
              isHost ? (
                <div className="flex gap-2">
                  <Button 
                    onClick={handleConfirm}
                    disabled={isCurrentPlayerConfirmed}
                    className={`
                      flex-1
                      ${isCurrentPlayerConfirmed 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }
                      flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold
                    `}
                  >
                    {isCurrentPlayerConfirmed ? (
                      <>
                        <Check className="h-4 w-4" />
                        확인됨
                      </>
                    ) : (
                      '확인'
                    )}
                  </Button>
                  
                  <Button 
                    onClick={handleIncreaseBlind}
                    className="bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold"
                  >
                    <TrendingUp className="h-4 w-4" />
                    블라인드 증가
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={handleConfirm}
                  disabled={isCurrentPlayerConfirmed}
                  className={`
                    w-full
                    ${isCurrentPlayerConfirmed 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }
                    flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold
                  `}
                >
                  {isCurrentPlayerConfirmed ? (
                    <>
                      <Check className="h-4 w-4" />
                      확인됨
                    </>
                  ) : (
                    '확인'
                  )}
                </Button>
              )
            )
          ) : (
            <div className="text-center text-gray-300 text-sm py-4">
              게임에서 탈락했습니다. 다른 플레이어들이 확인할 때까지 기다려주세요.
            </div>
          )}
        </div>
        
        {/* Confetti effect for wins */}
        {isWin && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-ping"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: '1s'
                }}
              >
                🎊
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
