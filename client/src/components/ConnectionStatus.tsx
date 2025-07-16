import { Wifi, WifiOff, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ConnectionStatusProps {
  isConnected: boolean;
  isReconnecting?: boolean;
}

export default function ConnectionStatus({ isConnected, isReconnecting }: ConnectionStatusProps) {
  if (isConnected && !isReconnecting) {
    return null; // 연결이 정상일 때는 표시하지 않음
  }

  return (
    <div className="fixed top-16 left-4 z-[9999]">
      <Badge 
        variant={isConnected ? "default" : "destructive"}
        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium ${
          isReconnecting 
            ? 'bg-yellow-500 text-white animate-pulse' 
            : isConnected 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
        }`}
      >
        {isReconnecting ? (
          <>
            <RotateCcw className="h-4 w-4 animate-spin" />
            재연결 중...
          </>
        ) : isConnected ? (
          <>
            <Wifi className="h-4 w-4" />
            연결됨
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            연결 끊김
          </>
        )}
      </Badge>
    </div>
  );
}
