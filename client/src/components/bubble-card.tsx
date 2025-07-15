import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { GripVertical, Palette, Tag } from "lucide-react";
import type { BubbleWithMessage } from "@shared/schema";

interface BubbleCardProps {
  bubble: BubbleWithMessage;
  onMove: (bubbleId: number, x: number, y: number) => void;
  onColorChange?: (bubbleId: number, color: string) => void;
  onCategoryChange?: (bubbleId: number, category: string) => void;
}

export default function BubbleCard({ bubble, onMove, onColorChange, onCategoryChange }: BubbleCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: bubble.x, y: bubble.y });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const getCategoryColor = (category: string) => {
    const colorMap = {
      "core-insight": "blue",
      "supporting-evidence": "green",
      "personal-reflection": "purple", 
      "action-items": "orange",
      "key-question": "red"
    };
    return colorMap[category as keyof typeof colorMap] || "blue";
  };

  const getCategoryLabel = (category: string) => {
    const labelMap = {
      "core-insight": "Core Insight",
      "supporting-evidence": "Supporting Evidence",
      "personal-reflection": "Personal Reflection",
      "action-items": "Action Items", 
      "key-question": "Key Question"
    };
    return labelMap[category as keyof typeof labelMap] || "General";
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    setPosition({ x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Ensure position values are valid integers
      const x = Math.round(Math.max(0, position.x));
      const y = Math.round(Math.max(0, position.y));
      onMove(bubble.id, x, y);
    }
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const wordCount = bubble.message.text.split(' ').length;
  const color = getCategoryColor(bubble.category);

  return (
    <Card
      ref={cardRef}
      className={`absolute cursor-move hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 border-${color}-200 ${
        isDragging ? 'scale-105 shadow-2xl z-50' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: bubble.width,
        minHeight: bubble.height,
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className={`bg-${color}-100 text-${color}-700 px-2 py-1 rounded-full text-xs font-medium`}>
            {getCategoryLabel(bubble.category)}
          </span>
          <div className="flex items-center space-x-1">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Tag className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCategoryChange?.(bubble.id, 'core-insight')}>
                  Core Insight
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCategoryChange?.(bubble.id, 'supporting-evidence')}>
                  Supporting Evidence
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCategoryChange?.(bubble.id, 'personal-reflection')}>
                  Personal Reflection
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCategoryChange?.(bubble.id, 'action-items')}>
                  Action Items
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCategoryChange?.(bubble.id, 'key-question')}>
                  Key Question
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        <p className="text-gray-800 font-medium text-sm leading-relaxed mb-3">
          {bubble.message.text}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{formatTime(bubble.message.createdAt)}</span>
          <span>{wordCount} words</span>
        </div>
      </div>
    </Card>
  );
}
