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

  // Update position when bubble data changes (e.g., from server)
  useEffect(() => {
    if (!isDragging) {
      setPosition({ x: bubble.x, y: bubble.y });
    }
  }, [bubble.x, bubble.y, isDragging]);

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
    e.preventDefault();
    console.log('Mouse down on bubble', bubble.id);
    setIsDragging(true);
    const rect = cardRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      console.log('Moving bubble', bubble.id, 'to', newX, newY);
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDragging) {
        e.preventDefault();
        console.log('Mouse up on bubble', bubble.id, 'at position', position);
        setIsDragging(false);
        const x = Math.round(Math.max(0, position.x));
        const y = Math.round(Math.max(0, position.y));
        onMove(bubble.id, x, y);
      }
    };

    if (isDragging) {
      console.log('Adding event listeners for bubble', bubble.id);
      document.addEventListener('mousemove', handleMouseMove, { passive: false });
      document.addEventListener('mouseup', handleMouseUp, { passive: false });
      
      return () => {
        console.log('Removing event listeners for bubble', bubble.id);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset.x, dragOffset.y, position.x, position.y, bubble.id, onMove]);

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const wordCount = bubble.message.text.split(' ').length;
  const color = bubble.color || getCategoryColor(bubble.category);
  const colorClasses = getColorClasses(color);

  return (
    <Card
      ref={cardRef}
      className={`absolute cursor-move hover:shadow-xl transition-all duration-200 transform hover:scale-105 border-2 ${colorClasses.border} ${
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
          <span className={`${colorClasses.bg} ${colorClasses.text} px-2 py-1 rounded-full text-xs font-medium`}>
            {getCategoryLabel(bubble.category)}
          </span>
          <div className="flex items-center space-x-1" onMouseDown={(e) => e.stopPropagation()}>
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
