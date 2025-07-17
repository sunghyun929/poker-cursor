import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { ChevronUp, ChevronDown } from "lucide-react";
import type { Player, GameState, PlayerAction } from "@shared/schema";

interface BettingControlsProps {
  player: Player;
  gameState: GameState;
  onAction: (action: PlayerAction) => void;
}

export default function BettingControls({ player, gameState, onAction }: BettingControlsProps) {
  const [betAmount, setBetAmount] = React.useState(gameState.minRaise);
  const [customBet, setCustomBet] = React.useState("");

  // If player has no chips, show spectator mode
  if (player.chips === 0) {
    return (
      <Card className="p-2 bg-black/95 backdrop-blur text-white w-80 max-w-sm relative betting-controls">
        <div className="space-y-2">
          <div className="text-center">
            <div className="font-medium text-sm">{player.name}</div>
            <div className="text-red-400 text-sm">관전 모드</div>
            <div className="text-gray-400 text-xs">게임에서 탈락했습니다</div>
          </div>
        </div>
      </Card>
    );
  }

  const callAmount = gameState.currentBet - player.currentBet;
  const canCheck = callAmount === 0;
  const canCall = callAmount > 0 && callAmount <= player.chips;
  
  // Big blind can raise even when call amount is 0 (when everyone called their blind)
  const isBigBlind = gameState.stage === 'preflop' && 
                     gameState.players[gameState.bigBlindPosition]?.id === player.id;
  
  // Determine if player can bet or raise
  const canBet = canCheck && gameState.currentBet === 0 && player.chips >= gameState.minRaise;
  const canRaise = (callAmount > 0 && player.chips > callAmount) ||
                   (isBigBlind && callAmount === 0 && player.chips > gameState.minRaise);
  const minRaise = Math.max(gameState.minRaise, gameState.bigBlind);
  const maxBet = player.chips;
  
  // Half big blind increment for betting arrows
  const betIncrement = Math.floor(gameState.bigBlind / 2);

  const handleFold = () => {
    onAction({ type: 'fold' });
  };

  const handleCheck = () => {
    onAction({ type: 'check' });
  };

  const handleCall = () => {
    onAction({ type: 'call' });
  };

  const handleBet = () => {
    const amount = customBet ? parseInt(customBet) : betAmount;
    if (amount >= minRaise && amount <= maxBet) {
      onAction({ type: 'bet', amount });
      setCustomBet("");
    }
  };

  const handleRaise = () => {
    const amount = customBet ? parseInt(customBet) : betAmount;
    
    // For big blind with call amount 0, the raise amount is the total bet
    // For others, it's call amount + raise amount
    if (isBigBlind && callAmount === 0) {
      // Big blind raising from their current position
      if (amount >= minRaise && amount <= maxBet) {
        onAction({ type: 'raise', amount });
        setCustomBet("");
      }
    } else {
      // Normal raise scenario
      const totalAmount = callAmount + amount;
      if (totalAmount >= (callAmount + minRaise) && totalAmount <= maxBet) {
        onAction({ type: 'raise', amount });
        setCustomBet("");
      }
    }
  };

  const handleAllIn = () => {
    onAction({ type: 'allIn' });
  };

  const handleQuickBet = (multiplier: number) => {
    // currentBet이 0이면 최소 레이즈로 처리
    const base = gameState.currentBet > 0 ? gameState.currentBet : minRaise;
    const amount = Math.min(base * multiplier, maxBet);
    setBetAmount(Math.max(amount, minRaise));
  };

  const handleIncrementBet = () => {
    const newAmount = Math.min(betAmount + betIncrement, maxBet);
    setBetAmount(newAmount);
  };

  const handleDecrementBet = () => {
    const newAmount = Math.max(betAmount - betIncrement, minRaise);
    setBetAmount(newAmount);
  };

  // 내 플레이어 객체 찾기
  const me = gameState.players.find(p => p.id === player.id);
  const myCurrentBet = me?.currentBet ?? 0;

  return (
    <Card className="p-2 bg-black/95 backdrop-blur text-white w-80 betting-controls relative">
      <div className="space-y-1">
        {/* Player Info - Compact */}
        <div className="text-center">
          <div className="font-medium text-sm">{player.name}</div>
          <div className="text-green-400 text-sm">${player.chips} chips</div>
          {callAmount > 0 && (
            <div className="text-yellow-400 text-sm">Call: ${callAmount}</div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-1">
          <Button 
            onClick={handleFold}
            variant="destructive"
            size="sm"
            className="flex-1 h-6 py-0"
          >
            Fold
          </Button>
          
          {canCheck && (
            <Button 
              onClick={handleCheck}
              variant="secondary"
              size="sm"
              className="flex-1 h-6 py-0"
            >
              Check
            </Button>
          )}
          
          {canCall && (
            <Button 
              onClick={handleCall}
              variant="default"
              size="sm"
              className="flex-1 h-6 py-0 bg-blue-600 hover:bg-blue-700"
            >
              Call ${callAmount}
            </Button>
          )}
        </div>

        {/* Betting Section - Compact */}
        {(canBet || canRaise) && (
          <>
            <div className="space-y-0.5">
              <div className="flex items-stretch relative">
                <Input
                  type="number"
                  placeholder="Amount"
                  value={customBet}
                  onChange={(e) => setCustomBet(e.target.value)}
                  min={minRaise}
                  max={maxBet}
                  className="flex-1 h-7 text-sm pr-8"
                />
                <div className="absolute right-0 top-0 h-7 w-7 flex flex-col border-l border-gray-300 bg-white">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleIncrementBet}
                    className="h-[14px] w-7 p-0 rounded-none hover:bg-gray-100 border-b border-gray-300 flex items-center justify-center"
                    disabled={betAmount >= maxBet}
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDecrementBet}
                    className="h-[14px] w-7 p-0 rounded-none hover:bg-gray-100 flex items-center justify-center"
                    disabled={betAmount <= minRaise}
                  >
                    <ChevronDown className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-gray-400 text-center">
                ${minRaise}-${maxBet} (±${betIncrement})
              </div>
              
              {/* Compact Slider */}
              <div>
                <Slider
                  value={[betAmount]}
                  onValueChange={([value]) => setBetAmount(value)}
                  min={minRaise}
                  max={maxBet}
                  step={betIncrement}
                  className="w-full"
                />
                <div className="text-center text-xs text-gray-400">
                  ${betAmount}
                </div>
              </div>
            </div>

            {/* Quick Bet Buttons - Smaller */}
            <div className="flex space-x-1 mt-2">
              <Button
                size="sm"
                className="flex-1 h-8 py-0 font-medium text-sm bg-green-600 hover:bg-green-700 text-white border-none"
                onClick={() => onAction({ type: 'raise', amount: minRaise })}
              >
                2 Bet
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 py-0 font-medium text-sm bg-blue-600 hover:bg-blue-700 text-white border-none"
                onClick={() => onAction({ type: 'raise', amount: minRaise * 2 })}
              >
                3 Bet
              </Button>
              <Button
                size="sm"
                className="flex-1 h-8 py-0 font-medium text-sm bg-red-600 hover:bg-red-700 text-white border-none"
                onClick={() => onAction({ type: 'raise', amount: minRaise * 3 })}
              >
                4 Bet
              </Button>
            </div>

            {/* Main Bet/Raise Button */}
            {canBet && (
              <Button 
                onClick={handleBet}
                className="w-full h-6 py-0 bg-orange-600 hover:bg-orange-700"
                size="sm"
                disabled={betAmount < minRaise || betAmount > maxBet}
              >
                Bet ${customBet || betAmount}
              </Button>
            )}
            
            {canRaise && (
              <Button 
                onClick={handleRaise}
                className="w-full h-6 py-0 bg-orange-600 hover:bg-orange-700"
                size="sm"
                disabled={betAmount < minRaise || betAmount > maxBet}
              >
                Raise ${customBet || betAmount}
              </Button>
            )}
          </>
        )}

        {/* All In Button */}
        <Button 
          onClick={handleAllIn}
          variant="destructive"
          size="sm"
          className="w-full h-6 py-0 bg-red-700 hover:bg-red-800"
        >
          All In (${player.chips})
        </Button>
      </div>
    </Card>
  );
}
