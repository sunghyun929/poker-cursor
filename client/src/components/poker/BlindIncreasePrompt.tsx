import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, X, Check, ChevronUp, ChevronDown } from "lucide-react";
import type { GameState } from "@shared/schema";

interface BlindIncreasePromptProps {
  gameState: GameState;
  currentPlayerId: string;
  onIncreaseBlind: (newBigBlind?: number) => void;
}

export default function BlindIncreasePrompt({ gameState, currentPlayerId, onIncreaseBlind }: BlindIncreasePromptProps) {
  const [showCustomAmount, setShowCustomAmount] = useState(false);
  const [customBigBlind, setCustomBigBlind] = useState(gameState.bigBlind * 2);

  const isHost = gameState.hostPlayerId === currentPlayerId;
  const isPending = gameState.blindIncrease?.pending;

  if (!isPending || !isHost) {
    return null;
  }

  const handleSkip = () => {
    onIncreaseBlind();
  };

  const handleDouble = () => {
    onIncreaseBlind(gameState.bigBlind * 2);
  };

  const handleCustom = () => {
    if (customBigBlind > gameState.bigBlind) {
      onIncreaseBlind(customBigBlind);
    }
  };

  // Quarter big blind increment for arrows
  const blindIncrement = Math.floor(gameState.bigBlind / 4);

  const handleIncrementBlind = () => {
    setCustomBigBlind(prev => prev + blindIncrement);
  };

  const handleDecrementBlind = () => {
    const newAmount = customBigBlind - blindIncrement;
    if (newAmount > gameState.bigBlind) {
      setCustomBigBlind(newAmount);
    }
  };

  return (
    <div className="fixed inset-0 z-[40] pointer-events-none">
      <div className="absolute bottom-4 right-4 pointer-events-auto">
        <Card className="w-80 bg-white border-2 border-orange-400 shadow-2xl backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-orange-800 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                블라인드 증가
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSkip}
                className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-gray-600">
              현재 블라인드: {gameState.smallBlind}/{gameState.bigBlind}
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleDouble}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm"
                size="sm"
              >
                2배로 증가 ({gameState.smallBlind * 2}/{gameState.bigBlind * 2})
              </Button>

              <Button 
                variant="outline"
                onClick={() => setShowCustomAmount(!showCustomAmount)}
                className="w-full text-sm"
                size="sm"
              >
                직접 설정
              </Button>

              {showCustomAmount && (
                <div className="space-y-2 p-2 bg-gray-50 rounded">
                  <Label htmlFor="customBlind" className="text-xs">
                    새 빅 블라인드
                  </Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      id="customBlind"
                      type="number"
                      value={customBigBlind}
                      onChange={(e) => setCustomBigBlind(Number(e.target.value))}
                      min={gameState.bigBlind + 1}
                      className="text-center text-sm h-8 flex-1"
                    />
                    <div className="flex flex-col">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleIncrementBlind}
                        className="h-4 w-6 p-0 border-gray-600"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleDecrementBlind}
                        className="h-4 w-6 p-0 border-gray-600"
                        disabled={customBigBlind - blindIncrement <= gameState.bigBlind}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button 
                      onClick={handleCustom}
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={customBigBlind <= gameState.bigBlind}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    (±{blindIncrement} 단위)
                  </div>
                </div>
              )}

              <Button 
                variant="ghost"
                onClick={handleSkip}
                className="w-full text-xs text-gray-500"
                size="sm"
              >
                현재 블라인드 유지
              </Button>
            </div>

            <div className="text-xs text-gray-500 text-center">
              10초 후 자동으로 현재 블라인드가 유지됩니다
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
