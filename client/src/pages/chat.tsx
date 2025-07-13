import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Workflow } from "lucide-react";
import MessageBubble from "@/components/message-bubble";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, MessageWithBubble, InsertMessage, InsertConversation } from "@shared/schema";

export default function Chat() {
  const { id } = useParams();
  const conversationId = id ? parseInt(id) : null;
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [conversationName, setConversationName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Get conversation details
  const { data: conversation } = useQuery<Conversation>({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
  });

  // Get messages for this conversation
  const { data: messages = [], isLoading } = useQuery<MessageWithBubble[]>({
    queryKey: ["/api/conversations", conversationId, "messages"],
    enabled: !!conversationId,
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: InsertConversation) => {
      const response = await apiRequest("POST", "/api/conversations", data);
      return response.json();
    },
    onSuccess: (newConversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setLocation(`/chat/${newConversation.id}`);
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: InsertMessage) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessage("");
    },
  });

  // Update conversation name mutation
  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiRequest("PATCH", `/api/conversations/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setIsEditingName(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (conversation) {
      setConversationName(conversation.name);
    }
  }, [conversation]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    if (!conversationId) {
      // Create new conversation first
      const name = conversationName.trim() || "New Conversation";
      createConversationMutation.mutate({ name });
      return;
    }

    sendMessageMutation.mutate({
      conversationId,
      text: message.trim(),
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNameSubmit = () => {
    if (conversationId && conversationName.trim() !== conversation?.name) {
      updateConversationMutation.mutate({
        id: conversationId,
        name: conversationName.trim(),
      });
    } else {
      setIsEditingName(false);
    }
  };

  const wordCount = messages.reduce((total, msg) => total + msg.text.split(' ').length, 0);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="gradient-primary-to-secondary text-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/conversations")}
              className="hover:bg-white/20 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
              {conversationName.substring(0, 2).toUpperCase() || "NC"}
            </div>
            <div>
              {isEditingName ? (
                <input
                  type="text"
                  value={conversationName}
                  onChange={(e) => setConversationName(e.target.value)}
                  onBlur={handleNameSubmit}
                  onKeyPress={(e) => e.key === "Enter" && handleNameSubmit()}
                  className="bg-transparent border-b border-white/50 text-lg font-semibold text-white focus:outline-none focus:border-white"
                  autoFocus
                />
              ) : (
                <h2
                  className="text-lg font-semibold cursor-pointer hover:text-purple-200"
                  onClick={() => setIsEditingName(true)}
                >
                  {conversationName || "New Conversation"}
                </h2>
              )}
              <p className="text-sm text-purple-200">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-purple-200">{wordCount} words</span>
            {conversationId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation(`/bubbles/${conversationId}`)}
                className="bg-white/20 hover:bg-white/30 text-white"
              >
                <Workflow className="mr-2 h-4 w-4" />
                To Bubbles
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-500">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Start your conversation by typing a message below.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                isUser={index % 2 === 0} // Alternate between user and self
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {!conversationId && (
            <div className="mb-4">
              <input
                type="text"
                placeholder="Conversation name..."
                value={conversationName}
                onChange={(e) => setConversationName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Type your thoughts..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                className="resize-none border border-gray-300 rounded-2xl px-4 py-3 pr-12 focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={1}
              />
            </div>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || sendMessageMutation.isPending || createConversationMutation.isPending}
              className="bg-primary hover:bg-primary/90 p-3 rounded-2xl"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
