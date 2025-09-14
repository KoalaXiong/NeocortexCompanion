import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { GripVertical, Palette, Plus, Volume2 } from "lucide-react";
import type { BubbleWithMessage } from "@shared/schema";

interface BubbleCardProps {
  bubble: BubbleWithMessage;
  onMove: (bubbleId: number, x: number, y: number) => void;
  onColorChange?: (bubbleId: number, color: string) => void;

  onTitleChange?: (bubbleId: number, title: string) => void;
  isCompact?: boolean; // Whether bubble is in compact mode
  isConnectMode?: boolean; // Whether connection mode is active
  isSelected?: boolean; // Whether bubble is selected for connection
  onBubbleClick?: (bubbleId: number) => void; // Handle single click in connect mode
  onBubbleDoubleClick?: (bubbleId: number) => void; // Handle double click for selection
}

export default function BubbleCard({ 
  bubble, 
  onMove, 
  onColorChange, 

  onTitleChange, 
  isCompact = false,
  isConnectMode = false,
  isSelected = false,
  onBubbleClick,
  onBubbleDoubleClick 
}: BubbleCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: bubble.x, y: bubble.y });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(bubble.title || "");
  const [isHovered, setIsHovered] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Update position only when bubble data changes and we're not dragging
  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: bubble.x, y: bubble.y });
    }
  }, [bubble.x, bubble.y, isDragging]);

  // Update local title when bubble data changes
  useEffect(() => {
    setLocalTitle(bubble.title || "");
  }, [bubble.title]);

  const getColorClasses = (color: string) => {
    const colorClassMap = {
      "blue": {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200"
      },
      "green": {
        bg: "bg-green-100", 
        text: "text-green-700",
        border: "border-green-200"
      },
      "purple": {
        bg: "bg-purple-100",
        text: "text-purple-700", 
        border: "border-purple-200"
      },
      "orange": {
        bg: "bg-orange-100",
        text: "text-orange-700",
        border: "border-orange-200"
      },
      "red": {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200"
      }
    };
    return colorClassMap[color as keyof typeof colorClassMap] || colorClassMap.blue;
  };



  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // In connect mode, don't start dragging
    if (isConnectMode) {
      return;
    }
    
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isConnectMode && onBubbleDoubleClick) {
      e.preventDefault();
      e.stopPropagation();
      onBubbleDoubleClick(bubble.id);
    }
  };

  const handleRightClick = (e: React.MouseEvent) => {
    if (isConnectMode && onBubbleClick) {
      e.preventDefault();
      e.stopPropagation();
      onBubbleClick(bubble.id);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const newX = Math.max(0, e.clientX - dragOffset.x);
      const newY = Math.max(0, e.clientY - dragOffset.y);
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        const newX = Math.max(0, e.clientX - dragOffset.x);
        const newY = Math.max(0, e.clientY - dragOffset.y);
        const finalX = Math.round(newX);
        const finalY = Math.round(newY);
        
        // Update local position immediately to prevent snap-back
        setPosition({ x: finalX, y: finalY });
        setIsDragging(false);
        
        // Save to database
        onMove(bubble.id, finalX, finalY);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset.x, dragOffset.y, bubble.id, onMove]);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTitleSave = () => {
    if (onTitleChange) {
      onTitleChange(bubble.id, localTitle);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setLocalTitle(bubble.title || "");
      setIsEditingTitle(false);
    }
  };

  // Text-to-speech function for bubble cards
  const handleReadOutLoud = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isReading) {
      speechSynthesis.cancel();
      setIsReading(false);
      return;
    }

    try {
      setIsReading(true);
      
      // Detect language from message content
      const detectLanguage = (text: string): string => {
        // Check for Japanese first (Hiragana and Katakana are unique to Japanese)
        if (/[\u3040-\u309f]/.test(text) || /[\u30a0-\u30ff]/.test(text)) return 'ja';
        // Check for Chinese (Kanji/Hanzi characters without Japanese scripts)
        if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
        if (/[àèéìíîòóùúûü]/.test(text.toLowerCase()) || 
            /\b(quello|questo|essere|molto|tutto|anche|fare|dire|dove|come|quando|perché|cosa|dovrebbe|persone|normali)\b/i.test(text)) {
          return 'it';
        }
        return 'en';
      };

      const languageCode = detectLanguage(bubble.message.text);
      const textToRead = bubble.message.text.replace(/^\[[\w\s]+\]\s*/, ''); // Clean text

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(textToRead);
        utterance.lang = languageCode;
        
        // Find appropriate voice for the language
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

  const wordCount = bubble.message.text.split(' ').length;
  const color = bubble.color || "blue";
  const baseColorClasses = getColorClasses(color);
  
  // Apply darker color for selected bubbles
  const colorClasses = isSelected ? {
    bg: baseColorClasses.bg.replace('100', '200'),
    text: baseColorClasses.text.replace('700', '800'),
    border: baseColorClasses.border.replace('200', '400')
  } : baseColorClasses;

  // Calculate adaptive sizing - increase height when hovered to show full content
  const normalWidth = 280;
  const normalHeight = 120;
  // Calculate dynamic height based on text length and line breaks for hovered state
  const textLines = bubble.message.text.split('\n').length;
  const estimatedLines = Math.ceil(bubble.message.text.length / 35) + textLines; // Approximate lines needed
  const hoveredHeight = Math.max(normalHeight, Math.min(400, estimatedLines * 20 + 80)); // Dynamic height with more space
  const currentWidth = isCompact && !isHovered ? bubble.width : normalWidth;
  const currentHeight = isCompact && !isHovered ? bubble.height : (isHovered ? hoveredHeight : normalHeight);

  return (
    <Card
      ref={cardRef}
      className={`absolute transition-all duration-200 border-2 ${colorClasses.border} ${
        isDragging ? 'scale-105 shadow-2xl' : isHovered ? 'shadow-xl scale-105' : 'hover:shadow-lg'
      } ${
        isConnectMode ? 'cursor-pointer' : 'cursor-move'
      } ${
        isSelected 
          ? 'ring-4 ring-purple-500 ring-opacity-75 shadow-purple-200 shadow-lg' 
          : isConnectMode && isHovered
          ? 'ring-2 ring-blue-400 ring-opacity-60 shadow-blue-100 shadow-xl'
          : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: currentWidth,
        height: currentHeight,
        userSelect: 'none',
        zIndex: isDragging ? 1000 : isHovered ? 200 : isSelected ? 50 : 10,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleRightClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-3 h-full flex flex-col overflow-hidden">
        <div className="flex items-start justify-between mb-2 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {/* Title input field */}
            {isEditingTitle ? (
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className={`${colorClasses.bg} ${colorClasses.text} px-2 py-1 h-6 text-xs font-medium border-0 focus:ring-1 focus:ring-current`}
                style={{ width: Math.max(60, localTitle.length * 8) + 'px' }}
                autoFocus
                onMouseDown={(e) => e.stopPropagation()}
              />
            ) : localTitle ? (
              <span 
                className={`${colorClasses.bg} ${colorClasses.text} px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setIsEditingTitle(true)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {localTitle}
              </span>
            ) : (
              <button 
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full transition-all hover:scale-110 ${colorClasses.bg} ${colorClasses.text} cursor-pointer`}
                onClick={() => setIsEditingTitle(true)}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ marginLeft: '40px' }}
              >
                <Plus className="w-3 h-3" />
              </button>
            )}

          </div>
          <div className="flex items-center space-x-1" onMouseDown={(e) => e.stopPropagation()}>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-6 w-6 p-0 transition-all ${
                isReading
                  ? 'text-green-600 hover:text-green-700' 
                  : 'text-gray-400 hover:text-gray-600'
              } ${isReading ? 'animate-pulse' : ''}`}
              onClick={handleReadOutLoud}
              title={isReading ? "Stop reading" : "Read out loud"}
            >
              <Volume2 className="h-3 w-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Palette className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onColorChange?.(bubble.id, 'blue')}>
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2" />
                  Blue
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onColorChange?.(bubble.id, 'green')}>
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-2" />
                  Green
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onColorChange?.(bubble.id, 'purple')}>
                  <div className="w-3 h-3 bg-purple-500 rounded-full mr-2" />
                  Purple
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onColorChange?.(bubble.id, 'orange')}>
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-2" />
                  Orange
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onColorChange?.(bubble.id, 'red')}>
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-2" />
                  Red
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        {/* Content - show full text when hovered, truncated when compact and not hovered */}
        <div className="flex-1" style={{ overflow: isHovered ? 'visible' : 'hidden' }}>
          {isCompact && !isHovered ? (
            <p className="text-gray-600 text-xs leading-tight overflow-hidden text-ellipsis whitespace-nowrap">
              {bubble.message.text.length > 30 ? bubble.message.text.substring(0, 30) + '...' : bubble.message.text}
            </p>
          ) : isHovered ? (
            <div className="text-gray-800 font-medium text-sm leading-relaxed mb-3" style={{ 
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              maxHeight: 'none',
              overflow: 'visible'
            }}>
              {bubble.message.text}
            </div>
          ) : (
            <p className="text-gray-800 font-medium text-sm leading-relaxed mb-3 overflow-hidden text-ellipsis" style={{ 
              display: '-webkit-box', 
              WebkitLineClamp: 4, 
              WebkitBoxOrient: 'vertical',
              wordBreak: 'break-word'
            }}>
              {bubble.message.text}
            </p>
          )}
        </div>
        {(!isCompact || isHovered) && (
          <div className="flex items-center justify-between text-xs text-gray-500 mt-auto flex-shrink-0">
            <span>{formatTime(bubble.message.createdAt)}</span>
            <span>{wordCount} words</span>
          </div>
        )}
      </div>
    </Card>
  );
}
