import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Lightbulb, Plus } from "lucide-react";
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
  const [isEditingKeyword, setIsEditingKeyword] = useState(false);
  const [keywordValue, setKeywordValue] = useState(keyword);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleKeywordSubmit = () => {
    onKeywordChange?.(message.id, keywordValue);
    setIsEditingKeyword(false);
  };

  const handleKeywordCancel = () => {
    setKeywordValue(keyword);
    setIsEditingKeyword(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleKeywordSubmit();
    } else if (e.key === 'Escape') {
      handleKeywordCancel();
    }
  };

  const currentKeyword = keyword || message.title || "";
  const hasKeyword = currentKeyword.length > 0;

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
        {/* Keyword display/input area */}
        {isSelectable && isSelected && (
          <div className="mb-2">
            {isEditingKeyword ? (
              <Input
                value={keywordValue}
                onChange={(e) => setKeywordValue(e.target.value)}
                onBlur={handleKeywordSubmit}
                onKeyDown={handleKeyPress}
                placeholder="Add keyword..."
                className={`h-6 text-xs px-2 ${
                  isUser 
                    ? 'bg-white text-black border-white/30' 
                    : 'bg-white text-black border-gray-300'
                }`}
                autoFocus
              />
            ) : hasKeyword ? (
              <button
                onClick={() => {
                  setKeywordValue(currentKeyword);
                  setIsEditingKeyword(true);
                }}
                className={`inline-block px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                  isUser 
                    ? 'bg-white/20 text-white' 
                    : 'bg-purple-100 text-purple-700'
                }`}
              >
                {currentKeyword}
              </button>
            ) : (
              <button
                onClick={() => {
                  setKeywordValue("");
                  setIsEditingKeyword(true);
                }}
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-all hover:scale-110 ${
                  isUser 
                    ? 'bg-white/20 text-white' 
                    : 'bg-purple-100 text-purple-500'
                }`}
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
        
        {/* Show existing keyword even when not in selection mode */}
        {(!isSelectable || !isSelected) && hasKeyword && (
          <div className="mb-2">
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              isUser 
                ? 'bg-white/20 text-white' 
                : 'bg-purple-100 text-purple-700'
            }`}>
              {currentKeyword}
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
