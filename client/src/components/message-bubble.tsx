import type { MessageWithBubble } from "@shared/schema";

interface MessageBubbleProps {
  message: MessageWithBubble;
  isUser: boolean;
}

export default function MessageBubble({ message, isUser }: MessageBubbleProps) {
  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md rounded-2xl px-4 py-3 shadow-sm ${
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
