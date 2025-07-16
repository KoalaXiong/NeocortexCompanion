import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Lightbulb } from "lucide-react";
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
        <div className="flex items-center justify-start mt-2 mr-2">
          <button
            onClick={() => onSelectionChange?.(message.id, !isSelected)}
            className="p-1 rounded-full transition-all hover:bg-gray-100"
            type="button"
          >
            <Lightbulb 
              className={`w-5 h-5 transition-all ${
                isSelected 
                  ? 'text-purple-500 fill-purple-500 drop-shadow-lg' 
                  : 'text-purple-300 stroke-2'
              }`}
            />
          </button>
        </div>
      )}
      <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 shadow-sm transition-all ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      } ${
        isUser 
          ? 'bg-primary text-white rounded-br-md' 
          : 'bg-white rounded-bl-md border border-gray-200'
      }`}>
        {message.title && (
          <div className="mb-2">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              isUser 
                ? 'bg-white/20 text-white' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              {message.title}
            </span>
          </div>
        )}
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
