import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, DollarSign } from "lucide-react";
import type { GameState } from "@shared/schema";

interface GameInfoProps {
  gameState: GameState;
}

export default function GameInfo({ gameState }: GameInfoProps) {
  const getStageDisplay = () => {
    switch (gameState.stage) {
      case 'waiting': return 'Waiting for Players';
      case 'preflop': return 'Pre-Flop';
      case 'flop': return 'Flop';
      case 'turn': return 'Turn';
      case 'river': return 'River';
      case 'showdown': return 'Showdown';
      case 'ended': return 'Game Ended';
      default: return gameState.stage;
    }
  };

  const getStageColor = () => {
    switch (gameState.stage) {
      case 'waiting': return 'bg-gray-500';
      case 'preflop': return 'bg-blue-500';
      case 'flop': return 'bg-green-500';
      case 'turn': return 'bg-yellow-500';
      case 'river': return 'bg-orange-500';
      case 'showdown': return 'bg-red-500';
      case 'ended': return 'bg-gray-600';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className="bg-black/70 backdrop-blur text-white">
      <CardContent className="p-4 space-y-3">
        {/* Room Code */}
        <div className="text-center">
          <div className="font-bold text-lg">Room: {gameState.roomCode}</div>
        </div>

        {/* Game Stage */}
        <div className="flex items-center justify-center space-x-2">
          <Clock className="h-4 w-4" />
          <Badge className={`${getStageColor()} text-white`}>
            {getStageDisplay()}
          </Badge>
        </div>

        {/* Players Count */}
        <div className="flex items-center justify-center space-x-2">
          <Users className="h-4 w-4" />
          <span className="text-sm">
            {gameState.players.length}/{gameState.maxPlayers} Players
          </span>
        </div>

        {/* Blinds */}
        <div className="flex items-center justify-center space-x-2">
          <DollarSign className="h-4 w-4" />
          <span className="text-sm">
            Blinds: ${gameState.smallBlind}/${gameState.bigBlind}
          </span>
        </div>

        {/* Current Turn */}
        {gameState.stage !== 'waiting' && gameState.stage !== 'ended' && (
          <div className="text-center">
            <div className="text-sm text-gray-300">Current Turn:</div>
            <div className="font-semibold text-yellow-400">
              {gameState.players[gameState.currentPlayerIndex]?.name || 'N/A'}
            </div>
          </div>
        )}

        {/* Pot Information */}
        {gameState.pot > 0 && (
          <div className="text-center border-t border-gray-600 pt-2">
            <div className="text-sm text-gray-300">Main Pot</div>
            <div className="font-bold text-yellow-400 text-lg">
              ${gameState.pot}
            </div>
          </div>
        )}

        {/* Side Pots */}
        {gameState.sidePots.length > 0 && (
          <div className="text-center">
            <div className="text-sm text-gray-300">Side Pots</div>
            {gameState.sidePots.map((sidePot, index) => (
              <div key={index} className="text-sm text-yellow-300">
                ${sidePot.amount} ({sidePot.eligiblePlayers.length} players)
              </div>
            ))}
          </div>
        )}

        {/* Current Bet */}
        {gameState.currentBet > 0 && (
          <div className="text-center">
            <div className="text-sm text-gray-300">To Call</div>
            <div className="font-semibold text-red-400">
              ${gameState.currentBet}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
