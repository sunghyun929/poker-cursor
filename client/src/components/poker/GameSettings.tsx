import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Play, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { GameState } from "@shared/schema";

interface GameSettingsProps {
  gameState: GameState;
  currentPlayerId: string;
  onUpdateSettings: (settings: { startingChips: number; smallBlind: number; bigBlind: number }) => void;
  onStartGame: () => void;
}

export default function GameSettings({ gameState, currentPlayerId, onUpdateSettings, onStartGame }: GameSettingsProps) {
  const [startingChips, setStartingChips] = useState(gameState.gameSettings?.startingChips || 1000);
  const [bigBlind, setBigBlind] = useState(gameState.gameSettings?.initialBigBlind || 20);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  
  // Small blind is always half of big blind
  const smallBlind = Math.floor(bigBlind / 2);
  const isHost = gameState.hostPlayerId === currentPlayerId;
  // 추가: 파산 시 인상 옵션
  const [bankruptIncreaseEnabled, setBankruptIncreaseEnabled] = useState(false);
  const [bankruptIncreasePercent, setBankruptIncreasePercent] = useState(200);
  // 추가: 한 바퀴 인상 옵션
  const [orbitIncreaseEnabled, setOrbitIncreaseEnabled] = useState(false);
  const [orbitIncreasePercent, setOrbitIncreasePercent] = useState(120);

  // Force re-render when gameState.players changes
  useEffect(() => {
    console.log(`GameSettings: Player count updated to ${gameState.players.length}`);
  }, [gameState.players.length]);

  const handleUpdateSettings = () => {
    onUpdateSettings({
      startingChips,
      smallBlind,
      bigBlind,
      bankruptIncreaseEnabled,
      bankruptIncreasePercent,
      orbitIncreaseEnabled,
      orbitIncreasePercent
    });
  };

  const handleStartGame = () => {
    onStartGame();
  };

  const handleCopyInviteCode = async () => {
    try {
      await navigator.clipboard.writeText(gameState.roomCode);
      setCopied(true);
      toast({
        title: "초대 코드 복사됨",
        description: `방 코드 "${gameState.roomCode}"가 클립보드에 복사되었습니다.`,
        duration: 2000,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "복사 실패",
        description: "클립보드 복사에 실패했습니다.",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  // 체크박스 스타일
  const checkboxStyle = `relative w-5 h-5 border-2 border-gray-400 rounded-md transition-colors duration-150 bg-white
  focus:outline-none focus:ring-2 focus:ring-blue-400
  checked:border-blue-600 checked:bg-blue-600
  hover:border-blue-500`;
  const checkmarkStyle = `absolute left-0 top-0 w-5 h-5 flex items-center justify-center pointer-events-none`;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-20 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4 bg-white">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-800">
            <Settings className="h-6 w-6" />
            게임 설정
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isHost ? (
            <>
              {/* 초대 코드 섹션 */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">방 초대 코드</Label>
                <div className="flex gap-2">
                  <Input
                    value={gameState.roomCode}
                    readOnly
                    className="text-center font-mono text-lg"
                  />
                  <Button
                    onClick={handleCopyInviteCode}
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="text-xs text-gray-500 text-center">
                  친구들에게 이 코드를 공유하여 게임에 초대하세요
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="startingChips" className="text-sm font-medium">
                    시작 칩 수
                  </Label>
                  <Input
                    id="startingChips"
                    type="number"
                    value={startingChips}
                    onChange={(e) => setStartingChips(Number(e.target.value))}
                    min={100}
                    max={10000}
                    step={100}
                    className="text-center"
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bigBlind" className="text-sm font-medium">
                      빅 블라인드
                    </Label>
                    <Input
                      id="bigBlind"
                      type="number"
                      value={bigBlind}
                      onChange={(e) => setBigBlind(Number(e.target.value))}
                      min={2}
                      max={200}
                      step={2}
                      className="text-center"
                    />
                    <div className="text-xs text-gray-500 text-center">
                      스몰 블라인드: {smallBlind} (빅 블라인드의 절반)
                    </div>
                  </div>
                </div>

                {/* 파산 시 인상 옵션 */}
                <div className="flex items-center gap-2 mt-4">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-base font-normal flex-nowrap">
                    <input
                      type="checkbox"
                      checked={bankruptIncreaseEnabled}
                      onChange={e => setBankruptIncreaseEnabled(e.target.checked)}
                      className="hidden"
                      id="bankruptIncrease"
                    />
                    <span className="custom-checkbox" />
                    플레이어 파산 시 빅 블라인드 인상
                    <Input
                      type="number"
                      value={bankruptIncreasePercent}
                      onChange={e => setBankruptIncreasePercent(Number(e.target.value))}
                      className="w-20 text-center ml-2"
                      min={100}
                      max={1000}
                      step={10}
                      disabled={!bankruptIncreaseEnabled}
                    />
                    %
                  </label>
                </div>

                {/* 한 바퀴 인상 옵션 */}
                <div className="flex items-center gap-2 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-base font-normal flex-nowrap">
                    <input
                      type="checkbox"
                      checked={orbitIncreaseEnabled}
                      onChange={e => setOrbitIncreaseEnabled(e.target.checked)}
                      className="hidden"
                      id="orbitIncrease"
                    />
                    <span className="custom-checkbox" />
                    딜러 한 바퀴 돌 때마다 빅 블라인드 인상
                    <Input
                      type="number"
                      value={orbitIncreasePercent}
                      onChange={e => setOrbitIncreasePercent(Number(e.target.value))}
                      className="w-20 text-center ml-2"
                      min={100}
                      max={1000}
                      step={10}
                      disabled={!orbitIncreaseEnabled}
                    />
                    %
                  </label>
                </div>

                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  <div className="font-medium mb-1">현재 설정:</div>
                  <div>• 시작 칩: {startingChips.toLocaleString()}개</div>
                  <div>• 블라인드: {smallBlind}/{bigBlind}</div>
                  <div>• 참가자: {gameState.players.length}명</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleUpdateSettings}
                  variant="outline"
                  className="flex-1"
                >
                  설정 적용
                </Button>
                <Button 
                  onClick={handleStartGame}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  disabled={gameState.players.length < 2}
                >
                  <Play className="mr-2 h-4 w-4" />
                  게임 시작
                </Button>
              </div>

              {gameState.players.length < 2 && (
                <div className="text-center text-sm text-red-600">
                  게임을 시작하려면 최소 2명의 플레이어가 필요합니다
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-lg font-medium text-gray-700">
                방장이 게임 설정 중입니다...
              </div>
              
              <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                <div className="font-medium mb-1">현재 설정:</div>
                <div>• 시작 칩: {gameState.gameSettings?.startingChips?.toLocaleString() || 1000}개</div>
                <div>• 블라인드: {gameState.smallBlind}/{gameState.bigBlind}</div>
                <div>• 참가자: {gameState.players.length}명</div>
              </div>

              <div className="flex items-center justify-center text-green-600">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600 mr-2"></div>
                설정 대기 중
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
