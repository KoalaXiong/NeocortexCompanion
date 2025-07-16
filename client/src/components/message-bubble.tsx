import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { MessageWithBubble } from "@shared/schema";

interface MessageBubbleProps {
  message: MessageWithBubble;
  isUser: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  keyword?: string;
  onSelectionChange?: (messageId: number, selected: boolean) => void;
  onKeywordChange?: (messageId: number, keyword: string) => void;
}

export default function MessageBubble({ 
  message, 
  isUser, 
  isSelectable = false, 
  isSelected = false, 
  keyword = "",
  onSelectionChange,
  onKeywordChange 
}: MessageBubbleProps) {
  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group relative`}>
      {isSelectable && (
        <div className="flex flex-col items-center justify-start mt-2 mr-2">
          <Checkbox
            checked={isSelected}
            onCheckedChange={(checked) => onSelectionChange?.(message.id, !!checked)}
            className="mb-2"
          />
          {isSelected && (
            <Input
              placeholder="keyword..."
              value={keyword}
              onChange={(e) => onKeywordChange?.(message.id, e.target.value)}
              className="w-20 h-6 text-xs px-1 text-center"
            />
          )}
        </div>
      )}
      <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 shadow-sm transition-all ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${
        isUser 
          ? 'bg-primary text-white rounded-br-md' 
          : 'bg-white rounded-bl-md border border-gray-200'
      }`}>
        <p className="text-sm md:text-base leading-relaxed">{message.text}</p>
        <p className={`text-xs mt-2 ${
          isUser ? 'text-purple-200' : 'text-gray-500'
        }`}>
          {formatTime(message.createdAt)}
        </p>
      </div>
    </div>
  );
}
