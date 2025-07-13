import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Workflow, MoreHorizontal } from "lucide-react";
import type { ConversationWithStats } from "@shared/schema";

interface ConversationCardProps {
  conversation: ConversationWithStats;
}

export default function ConversationCard({ conversation }: ConversationCardProps) {
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      const diffDays = Math.ceil(diffHours / 24);
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "from-blue-500 to-purple-600",
      "from-green-500 to-teal-600", 
      "from-orange-500 to-red-600",
      "from-purple-500 to-pink-600",
      "from-yellow-500 to-orange-600"
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarColor(conversation.name)} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
              {conversation.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{conversation.name}</h3>
              <p className="text-gray-500">Updated {formatDate(conversation.updatedAt)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
              {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
            </span>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {conversation.lastMessage && (
          <p className="text-gray-600 mb-4 line-clamp-2">
            {conversation.lastMessage}
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <Link href={`/chat/${conversation.id}`}>
              <Button size="sm">
                <MessageSquare className="mr-1 h-4 w-4" />
                Continue
              </Button>
            </Link>
            <Link href={`/bubbles/${conversation.id}`}>
              <Button variant="outline" size="sm">
                <Workflow className="mr-1 h-4 w-4" />
                To Bubbles
              </Button>
            </Link>
          </div>
          <span className="text-sm text-gray-500">{conversation.wordCount} words</span>
        </div>
      </CardContent>
    </Card>
  );
}
