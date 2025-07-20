import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Lightbulb, Plus, Edit3, Check, X } from "lucide-react";
import type { MessageWithBubble } from "@shared/schema";

interface MessageBubbleProps {
  message: MessageWithBubble;
  isUser: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  keyword?: string;
  onSelectionChange?: (messageId: number, selected: boolean) => void;
  onKeywordChange?: (messageId: number, keyword: string) => void;
  onMessageEdit?: (messageId: number, newText: string) => void;
}

export default function MessageBubble({ 
  message, 
  isUser, 
  isSelectable = false, 
  isSelected = false, 
  keyword = "",
  onSelectionChange,
  onKeywordChange,
  onMessageEdit
}: MessageBubbleProps) {
  const [isEditingKeyword, setIsEditingKeyword] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [keywordValue, setKeywordValue] = useState(keyword);
  const [messageValue, setMessageValue] = useState(message.text);

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

  const handleMessageSubmit = () => {
    onMessageEdit?.(message.id, messageValue);
    setIsEditingMessage(false);
  };

  const handleMessageCancel = () => {
    setMessageValue(message.text);
    setIsEditingMessage(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleKeywordSubmit();
    } else if (e.key === 'Escape') {
      handleKeywordCancel();
    }
  };

  const handleMessageKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleMessageSubmit();
    } else if (e.key === 'Escape') {
      handleMessageCancel();
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
      <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 shadow-sm transition-all relative group ${
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

        {/* Edit Button */}
        {!isEditingMessage && onMessageEdit && (
          <button
            onClick={() => setIsEditingMessage(true)}
            className={`absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full ${
              isUser 
                ? 'bg-white/20 hover:bg-white/30 text-white' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}
            title="Edit message"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}

        {/* Message Content */}
        {isEditingMessage ? (
          <div className="space-y-3">
            <Textarea
              value={messageValue}
              onChange={(e) => setMessageValue(e.target.value)}
              onKeyDown={handleMessageKeyPress}
              className={`w-full resize-none text-sm md:text-base leading-relaxed border-0 p-0 focus:ring-0 focus:outline-none ${
                isUser 
                  ? 'bg-transparent text-white placeholder-white/60' 
                  : 'bg-transparent text-gray-900 placeholder-gray-400'
              }`}
              style={{
                minHeight: `${Math.max(120, messageValue.split('\n').length * 28 + 40)}px`,
                height: 'auto'
              }}
              placeholder="Edit your message..."
              autoFocus
              rows={Math.max(4, messageValue.split('\n').length + 2)}
            />
            <div className={`flex justify-end space-x-2 pt-2 border-t ${
              isUser ? 'border-white/20' : 'border-gray-200'
            }`}>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMessageCancel}
                className={`h-7 px-3 text-xs ${
                  isUser 
                    ? 'hover:bg-white/20 text-white' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleMessageSubmit}
                className={`h-7 px-3 text-xs ${
                  isUser 
                    ? 'hover:bg-white/20 text-white' 
                    : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{message.text}</p>
        )}
        
        {/* Time Display */}
        {!isEditingMessage && (
          <p className={`text-xs mt-2 ${
            isUser ? 'text-purple-200' : 'text-gray-500'
          }`}>
            {formatTime(message.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}
