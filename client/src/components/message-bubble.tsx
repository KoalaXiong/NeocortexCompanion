import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Lightbulb, Plus, Edit3, Check, X, Trash2, Split, Volume2 } from "lucide-react";
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
  onMessageDelete?: (messageId: number) => void;
  onMessageSplit?: (messageId: number) => void;
}

export default function MessageBubble({ 
  message, 
  isUser, 
  isSelectable = false, 
  isSelected = false, 
  keyword = "",
  onSelectionChange,
  onKeywordChange,
  onMessageEdit,
  onMessageDelete,
  onMessageSplit
}: MessageBubbleProps) {
  // Clean message text by removing language prefixes (helper function)
  const cleanText = message.text.replace(/^\[[\w\s]+\]\s*/, '');
  
  // Detect language from message content and metadata
  const messageLanguage = (() => {
    // Check for old language prefix format
    const prefixMatch = message.text.match(/^\[(\w+)\]/);
    if (prefixMatch) {
      return prefixMatch[1];
    }
    
    // Check metadata (for new translations)
    if (message.translatedFrom) {
      // This is a translation - detect language by content
      const text = message.text;
      if (/[\u4e00-\u9fff]/.test(text)) return 'Chinese';
      if (/[àèéìíîòóùúûü]/.test(text.toLowerCase()) || /zione|mente|essere|quello|questo/.test(text.toLowerCase())) return 'Italian';
      return 'English'; // Default for translations
    }
    
    // For original messages with originalLanguage metadata, use that
    if (message.originalLanguage) {
      const languageMap: Record<string, string> = {
        'zh': 'Chinese',
        'en': 'English',
        'it': 'Italian',
        'fr': 'French',
        'de': 'German',
        'es': 'Spanish',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic'
      };
      return languageMap[message.originalLanguage] || null;
    }
    
    // Legacy detection for old messages without originalLanguage metadata
    const text = message.text;
    if (/[\u4e00-\u9fff]/.test(text)) return 'Chinese';
    
    return null; // No language indicator for other cases
  })();

  // State variables
  const [isEditingKeyword, setIsEditingKeyword] = useState(false);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [keywordValue, setKeywordValue] = useState(keyword);
  const [messageValue, setMessageValue] = useState(cleanText);
  const [isReading, setIsReading] = useState(false);

  // Update messageValue when message.text changes
  useEffect(() => {
    if (!isEditingMessage) {
      setMessageValue(cleanText);
    }
  }, [message.text, cleanText, isEditingMessage]);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCleanText = (text: string): string => {
    return text.replace(/^\[[\w\s]+\]\s*/, '');
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
    const trimmedValue = messageValue.trim();
    if (trimmedValue !== message.text) {
      onMessageEdit?.(message.id, trimmedValue);
    }
    setIsEditingMessage(false);
  };

  const handleMessageCancel = () => {
    setMessageValue(cleanText);
    setIsEditingMessage(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleKeywordSubmit();
    } else if (e.key === 'Escape') {
      handleKeywordCancel();
    }
  };

  // Text-to-speech function using Google Translate
  const handleReadOutLoud = async () => {
    if (isReading) {
      // Stop any currently playing speech
      speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    try {
      setIsReading(true);
      
      // Get the language code for the text
      const getLanguageCode = (lang: string | null): string => {
        if (!lang) return 'en';
        const langMap: Record<string, string> = {
          'Chinese': 'zh',
          'English': 'en',
          'Italian': 'it',
          'French': 'fr',
          'German': 'de',
          'Spanish': 'es',
          'Portuguese': 'pt',
          'Russian': 'ru',
          'Japanese': 'ja',
          'Korean': 'ko',
          'Arabic': 'ar'
        };
        return langMap[lang] || 'en';
      };

      const languageCode = getLanguageCode(messageLanguage);
      const textToRead = cleanText;

      // Use Web Speech API with appropriate language
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = languageCode;
        
        // Find the best voice for the language
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.lang.startsWith(languageCode) || 
          voice.lang.startsWith(languageCode.split('-')[0])
        );
        
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.rate = 0.9;
        utterance.onend = () => setIsReading(false);
        utterance.onerror = () => setIsReading(false);

        speechSynthesis.speak(utterance);
      } else {
        throw new Error('Speech synthesis not supported');
      }

    } catch (error) {
      console.error('Text-to-speech error:', error);
      setIsReading(false);
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
    <div className={`flex ${
      isEditingMessage 
        ? 'justify-center' 
        : isUser ? 'justify-end' : 'justify-start'
    } group relative`}>
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
      <div className={`${
        isEditingMessage 
          ? 'max-w-4xl w-full' 
          : 'max-w-xs md:max-w-md'
      } rounded-2xl px-4 py-3 shadow-sm transition-all relative group ${
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

        {/* Delete Button - Left Side */}
        {!isEditingMessage && onMessageDelete && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onMessageDelete(message.id)}
              className={`p-1 rounded-full ${
                isUser 
                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100' 
                  : 'bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600'
              }`}
              title="Delete message"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Other Action Buttons - Right Side */}
        {!isEditingMessage && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* Mobile layout - vertical stack */}
            <div className="md:hidden flex flex-col space-y-1">
              <button
                onClick={handleReadOutLoud}
                className={`p-1 rounded-full transition-all ${
                  isReading
                    ? isUser 
                      ? 'bg-green-500/30 text-green-200' 
                      : 'bg-green-100 text-green-600'
                    : isUser 
                      ? 'bg-white/20 hover:bg-white/30 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                } ${isReading ? 'animate-pulse' : ''}`}
                title={isReading ? "Stop reading" : "Read out loud"}
              >
                <Volume2 className="w-3 h-3" />
              </button>
              {onMessageSplit && message.text.includes('\n') && (
                <button
                  onClick={() => onMessageSplit(message.id)}
                  className={`p-1 rounded-full ${
                    isUser 
                      ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-blue-100' 
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-600'
                  }`}
                  title="Split message by line breaks"
                >
                  <Split className="w-3 h-3" />
                </button>
              )}
              {onMessageEdit && (
                <button
                  onClick={() => setIsEditingMessage(true)}
                  className={`p-1 rounded-full ${
                    isUser 
                      ? 'bg-white/20 hover:bg-white/30 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                  title="Edit message"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
            
            {/* Desktop layout - horizontal */}
            <div className="hidden md:flex space-x-1">
              <button
                onClick={handleReadOutLoud}
                className={`p-1 rounded-full transition-all ${
                  isReading
                    ? isUser 
                      ? 'bg-green-500/30 text-green-200' 
                      : 'bg-green-100 text-green-600'
                    : isUser 
                      ? 'bg-white/20 hover:bg-white/30 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                } ${isReading ? 'animate-pulse' : ''}`}
                title={isReading ? "Stop reading" : "Read out loud"}
              >
                <Volume2 className="w-3 h-3" />
              </button>
              {onMessageSplit && message.text.includes('\n') && (
                <button
                  onClick={() => onMessageSplit(message.id)}
                  className={`p-1 rounded-full ${
                    isUser 
                      ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-blue-100' 
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-500 hover:text-blue-600'
                  }`}
                  title="Split message by line breaks"
                >
                  <Split className="w-3 h-3" />
                </button>
              )}
              {onMessageEdit && (
                <button
                  onClick={() => setIsEditingMessage(true)}
                  className={`p-1 rounded-full ${
                    isUser 
                      ? 'bg-white/20 hover:bg-white/30 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                  }`}
                  title="Edit message"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Message Content */}
        {isEditingMessage ? (
          <div className="flex flex-col h-full">
            <Textarea
              value={messageValue}
              onChange={(e) => setMessageValue(e.target.value)}
              onKeyDown={handleMessageKeyPress}
              className={`flex-1 w-full resize-none text-sm md:text-base leading-relaxed border-0 p-0 focus:ring-0 focus:outline-none overflow-hidden ${
                isUser 
                  ? 'bg-transparent text-white placeholder-white/60' 
                  : 'bg-transparent text-gray-900 placeholder-gray-400'
              }`}
              style={{
                minHeight: '200px',
                height: 'auto',
                overflow: 'auto'
              }}
              placeholder="Edit your message..."
              autoFocus
            />
            <div className={`flex justify-end space-x-2 pt-3 mt-3 border-t ${
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
          <div>
            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{cleanText}</p>
            {messageLanguage && (
              <div className="mt-1 opacity-60">
                <span className="text-xs bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded">
                  {messageLanguage}
                </span>
              </div>
            )}
          </div>
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
