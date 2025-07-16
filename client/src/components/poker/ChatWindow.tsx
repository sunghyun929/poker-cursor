import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, X } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

interface ChatWindowProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onClose: () => void;
  currentPlayerId: string;
}

export default function ChatWindow({ messages, onSendMessage, onClose, currentPlayerId }: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <Card className="fixed top-4 right-4 w-80 h-96 z-[9998] bg-black/90 backdrop-blur text-white border-gray-600">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">채팅</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 flex flex-col h-full">
        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 mb-3">
          <div className="space-y-2">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4">
                아직 메시지가 없습니다
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="text-sm">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span 
                          className={`font-medium ${
                            message.playerId === currentPlayerId 
                              ? 'text-blue-400' 
                              : 'text-green-400'
                          }`}
                        >
                          {message.playerName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="text-gray-200 mt-1 break-words">
                        {message.message}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
            maxLength={200}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
