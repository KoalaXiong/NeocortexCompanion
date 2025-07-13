import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import type { BubbleWithMessage } from "@shared/schema";

interface BubbleCardProps {
  bubble: BubbleWithMessage;
  onMove: (bubbleId: number, x: number, y: number) => void;
}

export default function BubbleCard({ bubble, onMove }: BubbleCardProps) {
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
      onMove(bubble.id, position.x, position.y);
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
          <GripVertical className="h-4 w-4 text-gray-400" />
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
