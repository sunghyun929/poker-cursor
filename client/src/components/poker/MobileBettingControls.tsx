import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Player, PlayerAction, GameState } from '@shared/schema';

interface MobileBettingControlsProps {
  player: Player;
  gameState: GameState;
  onPlayerAction: (action: PlayerAction) => void;
}

export default function MobileBettingControls({ 
  player, 
  gameState, 
  onPlayerAction 
}: MobileBettingControlsProps) {
  const [betAmount, setBetAmount] = React.useState(gameState.minRaise);
  
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
    onPlayerAction({ type: 'fold' });
  };

  const handleCheck = () => {
    onPlayerAction({ type: 'check' });
  };

  const handleCall = () => {
    onPlayerAction({ type: 'call' });
  };

  const handleBet = () => {
    const amount = betAmount;
    if (amount >= minRaise && amount <= maxBet) {
      onPlayerAction({ type: 'bet', amount });
      setBetAmount(minRaise);
    }
  };

  const handleRaise = () => {
    const amount = betAmount;
    
    // For big blind with call amount 0, the raise amount is the total bet
    if (isBigBlind && callAmount === 0) {
      if (amount >= minRaise && amount <= maxBet) {
        onPlayerAction({ type: 'raise', amount });
        setBetAmount(minRaise);
      }
    } else {
      // Normal raise scenario
      const totalAmount = callAmount + amount;
      if (totalAmount >= (callAmount + minRaise) && totalAmount <= maxBet) {
        onPlayerAction({ type: 'raise', amount });
        setBetAmount(minRaise);
      }
    }
  };

  const handleAllIn = () => {
    onPlayerAction({ type: 'allIn' });
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

  // If player has no chips, show spectator mode
  if (player.chips === 0) {
    return (
      <div 
        className="bg-black/95 backdrop-blur text-white rounded-lg text-center"
        style={{ padding: 'var(--spacing-sm)' }}
      >
        <div style={{ fontSize: 'var(--text-sm)' }} className="font-medium">{player.name}</div>
        <div style={{ fontSize: 'var(--text-sm)' }} className="text-red-400">관전 모드</div>
        <div style={{ fontSize: 'var(--text-xs)' }} className="text-gray-400">게임에서 탈락했습니다</div>
      </div>
    );
  }

  return (
    <div 
      className="bg-black/95 backdrop-blur text-white rounded-lg"
      style={{ 
        padding: 'var(--spacing-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)'
      }}
    >
      {/* Quick Actions - Flexbox with wrap */}
      <div 
        className="flex flex-wrap"
        style={{ 
          gap: 'var(--spacing-xs)',
          justifyContent: 'space-between'
        }}
      >
        <Button 
          onClick={handleFold}
          variant="destructive"
          size="sm"
          className="flex-1 min-w-[4rem]"
          style={{ 
            height: 'var(--button-height)',
            fontSize: 'var(--text-xs)',
            padding: 'var(--spacing-xs)'
          }}
        >
          Fold
        </Button>
        
        {canCheck && (
          <Button 
            onClick={handleCheck}
            variant="secondary"
            size="sm"
            className="flex-1 min-w-[4rem]"
            style={{ 
              height: 'var(--button-height)',
              fontSize: 'var(--text-xs)',
              padding: 'var(--spacing-xs)'
            }}
          >
            Check
          </Button>
        )}
        
        {canCall && (
          <Button 
            onClick={handleCall}
            variant="default"
            size="sm"
            className="flex-1 min-w-[4rem] bg-blue-600 hover:bg-blue-700"
            style={{ 
              height: 'var(--button-height)',
              fontSize: 'var(--text-xs)',
              padding: 'var(--spacing-xs)'
            }}
          >
            Call ${callAmount}
          </Button>
        )}
      </div>

      {/* Bet Amount Control */}
      <div 
        className="flex items-center"
        style={{ gap: 'var(--spacing-xs)' }}
      >
        <Button
          onClick={handleDecrementBet}
          variant="outline"
          size="sm"
          className="p-0"
          style={{ 
            width: 'var(--button-height)',
            height: 'var(--button-height)',
            fontSize: 'var(--text-xs)'
          }}
          disabled={betAmount <= minRaise}
        >
          -
        </Button>
        
        <div className="flex-1 text-center">
          <div 
            className="text-green-400 font-bold"
            style={{ fontSize: 'var(--text-sm)' }}
          >
            ${betAmount}
          </div>
        </div>
        
        <Button
          onClick={handleIncrementBet}
          variant="outline"
          size="sm"
          className="p-0"
          style={{ 
            width: 'var(--button-height)',
            height: 'var(--button-height)',
            fontSize: 'var(--text-xs)'
          }}
          disabled={betAmount >= maxBet}
        >
          +
        </Button>
      </div>

      {/* Action Buttons - Flexbox with wrap */}
      <div 
        className="flex flex-wrap"
        style={{ 
          gap: 'var(--spacing-xs)',
          justifyContent: 'space-between'
        }}
      >
        {canBet && (
          <Button
            onClick={handleBet}
            disabled={betAmount < minRaise || betAmount > maxBet}
            className="flex-1 min-w-[5rem] bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500"
            style={{ 
              height: 'var(--button-height)',
              fontSize: 'var(--text-xs)',
              padding: 'var(--spacing-xs)'
            }}
          >
            Bet ${betAmount}
          </Button>
        )}
        
        {canRaise && (
          <Button
            onClick={handleRaise}
            disabled={
              (isBigBlind && callAmount === 0) 
                ? (betAmount < minRaise || betAmount > maxBet)
                : (callAmount + betAmount < callAmount + minRaise || callAmount + betAmount > maxBet)
            }
            className="flex-1 min-w-[5rem] bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500"
            style={{ 
              height: 'var(--button-height)',
              fontSize: 'var(--text-xs)',
              padding: 'var(--spacing-xs)'
            }}
          >
            Raise ${betAmount}
          </Button>
        )}
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="destructive"
              size="sm"
              className="flex-1 min-w-[5rem] bg-orange-600 hover:bg-orange-700"
              style={{ 
                height: 'var(--button-height)',
                fontSize: 'var(--text-xs)',
                padding: 'var(--spacing-xs)'
              }}
            >
              All-in ${player.chips}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="z-[10000] bg-gray-900 border-gray-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirm All-in</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                Are you sure you want to go all-in with ${player.chips}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-600 text-white border-gray-500 hover:bg-gray-700">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleAllIn}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Confirm All-in
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
