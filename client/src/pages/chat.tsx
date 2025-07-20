import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Workflow, Lightbulb, Copy, Move, Plus } from "lucide-react";
import MessageBubble from "@/components/message-bubble";
import { apiRequest } from "@/lib/queryClient";
import type { Conversation, ConversationWithStats, MessageWithBubble, InsertMessage, InsertConversation } from "@shared/schema";

export default function Chat() {
  const { id } = useParams();
  const conversationId = id ? parseInt(id) : null;
  const [, setLocation] = useLocation();
  const [message, setMessage] = useState("");
  const [conversationName, setConversationName] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [messageKeywords, setMessageKeywords] = useState<Map<number, string>>(new Map());
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const [targetConversationId, setTargetConversationId] = useState<string>("");
  const [removeFromOriginal, setRemoveFromOriginal] = useState(false);
  const preventAutoScroll = useRef(false);
  const savedScrollPosition = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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

  // Get all conversations for move dialog
  const { data: allConversations = [] } = useQuery<ConversationWithStats[]>({
    queryKey: ["/api/conversations"],
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

  // Update message mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      const response = await apiRequest("PATCH", `/api/messages/${id}`, { text });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  useEffect(() => {
    if (preventAutoScroll.current && messagesContainerRef.current) {
      // Restore saved scroll position without animation
      const container = messagesContainerRef.current;
      container.scrollTop = savedScrollPosition.current;
      preventAutoScroll.current = false;
    } else if (!preventAutoScroll.current && messages.length > 0) {
      // Auto-scroll to bottom for new messages
      setTimeout(() => {
        if (!preventAutoScroll.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
      }, 50);
    }
  }, [messages]);

  // Selection handlers
  const handleSelectionChange = (messageId: number, selected: boolean) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(messageId);
        // Initialize keyword with existing message title if available
        const message = messages.find(m => m.id === messageId);
        if (message?.title && !messageKeywords.has(messageId)) {
          setMessageKeywords(prev => {
            const newMap = new Map(prev);
            newMap.set(messageId, message.title);
            return newMap;
          });
        }
      } else {
        newSet.delete(messageId);
        setMessageKeywords(prev => {
          const newMap = new Map(prev);
          newMap.delete(messageId);
          return newMap;
        });
      }
      return newSet;
    });
  };

  const handleKeywordChange = (messageId: number, keyword: string) => {
    setMessageKeywords(prev => {
      const newMap = new Map(prev);
      newMap.set(messageId, keyword);
      return newMap;
    });

    // Save keyword to the message in the database immediately
    updateMessageTitle(messageId, keyword);
  };

  const handleMessageEdit = (messageId: number, newText: string) => {
    // Store the current scroll position
    if (messagesContainerRef.current) {
      savedScrollPosition.current = messagesContainerRef.current.scrollTop;
      preventAutoScroll.current = true;
    }

    // Update message text in the database
    updateMessageMutation.mutate({ id: messageId, text: newText.trim() });
  };

  const updateMessageTitle = async (messageId: number, title: string) => {
    try {
      // Save current scroll position and set flag to prevent auto-scroll
      if (messagesContainerRef.current) {
        savedScrollPosition.current = messagesContainerRef.current.scrollTop;
        preventAutoScroll.current = true;
      }
      
      await apiRequest("PATCH", `/api/messages/${messageId}`, { title });
      // Refresh messages to show the updated title
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
    } catch (error) {
      console.error("Error updating message title:", error);
      preventAutoScroll.current = false;
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedMessages(new Set());
      setMessageKeywords(new Map());
    }
  };

  const selectAllMessages = () => {
    setSelectedMessages(new Set(messages.map(m => m.id)));
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
    setMessageKeywords(new Map());
  };

  // Move/Copy handlers
  const handleMoveToNewConversation = async () => {
    if (selectedMessages.size === 0 || !newConversationTitle.trim()) return;
    
    try {
      // Create new conversation
      const createResponse = await apiRequest("POST", "/api/conversations", { 
        name: newConversationTitle.trim() 
      });
      const newConversation = await createResponse.json();
      
      // Get selected message details
      const selectedMessagesList = messages.filter(m => selectedMessages.has(m.id));
      
      // Copy messages to new conversation
      for (const msg of selectedMessagesList) {
        const keyword = messageKeywords.get(msg.id) || "";
        await apiRequest("POST", "/api/messages", {
          conversationId: newConversation.id,
          text: msg.text,
          title: keyword
        });
        
        // Remove from original if requested
        if (removeFromOriginal) {
          await apiRequest("DELETE", `/api/messages/${msg.id}`);
        }
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      // Clear selection and close dialog
      clearSelection();
      setShowMoveDialog(false);
      setNewConversationTitle("");
      setRemoveFromOriginal(false);
      
      // Navigate to new conversation
      setLocation(`/chat/${newConversation.id}`);
      
    } catch (error) {
      console.error("Error moving messages:", error);
    }
  };

  const handleMoveToExistingConversation = async () => {
    if (selectedMessages.size === 0 || !targetConversationId) return;
    
    try {
      // Get selected message details
      const selectedMessagesList = messages.filter(m => selectedMessages.has(m.id));
      
      // Copy messages to target conversation
      for (const msg of selectedMessagesList) {
        const keyword = messageKeywords.get(msg.id) || "";
        await apiRequest("POST", "/api/messages", {
          conversationId: parseInt(targetConversationId),
          text: msg.text,
          title: keyword
        });
        
        // Remove from original if requested
        if (removeFromOriginal) {
          await apiRequest("DELETE", `/api/messages/${msg.id}`);
        }
      }
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      // Clear selection and close dialog
      clearSelection();
      setShowMoveDialog(false);
      setTargetConversationId("");
      setRemoveFromOriginal(false);
      
    } catch (error) {
      console.error("Error moving messages:", error);
    }
  };

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
            <Button
              onClick={toggleSelectionMode}
              variant="ghost"
              size="sm"
              className="hover:bg-white/20 text-white"
            >
              <Lightbulb 
                className={`h-4 w-4 transition-all ${
                  isSelectionMode 
                    ? 'fill-white drop-shadow-lg' 
                    : 'stroke-2'
                }`}
              />
            </Button>
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

      {/* Selection Toolbar */}
      {isSelectionMode && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-800">
                {selectedMessages.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllMessages}
                disabled={selectedMessages.size === messages.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedMessages.size === 0}
              >
                Clear
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMoveDialog(true)}
                disabled={selectedMessages.size === 0}
              >
                <Move className="h-4 w-4 mr-1" />
                Move
              </Button>
            </div>
          </div>
        </div>
      )}



      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto">
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
                isSelectable={isSelectionMode}
                isSelected={selectedMessages.has(message.id)}
                keyword={messageKeywords.get(message.id) || message.title || ""}
                onSelectionChange={handleSelectionChange}
                onKeywordChange={handleKeywordChange}
                onMessageEdit={handleMessageEdit}
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

      {/* Move Messages Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Selected Messages</DialogTitle>
            <DialogDescription>
              Choose how to organize your selected messages into conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Moving {selectedMessages.size} message{selectedMessages.size !== 1 ? 's' : ''}
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Create New Conversation</label>
                  <Input
                    placeholder="New conversation title..."
                    value={newConversationTitle}
                    onChange={(e) => setNewConversationTitle(e.target.value)}
                    className="mt-1"
                  />
                  <Button
                    onClick={handleMoveToNewConversation}
                    disabled={!newConversationTitle.trim()}
                    className="w-full mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create & Move
                  </Button>
                </div>
                
                <div className="text-center text-sm text-gray-500">or</div>
                
                <div>
                  <label className="text-sm font-medium">Move to Existing Conversation</label>
                  <Select value={targetConversationId} onValueChange={setTargetConversationId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select conversation..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allConversations
                        .filter(conv => conv.id !== conversationId)
                        .map(conv => (
                          <SelectItem key={conv.id} value={conv.id.toString()}>
                            {conv.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleMoveToExistingConversation}
                    disabled={!targetConversationId}
                    className="w-full mt-2"
                  >
                    <Move className="h-4 w-4 mr-2" />
                    Move to Conversation
                  </Button>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={removeFromOriginal}
                    onChange={(e) => setRemoveFromOriginal(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Remove from original conversation</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">
                  {removeFromOriginal ? "Messages will be moved" : "Messages will be copied"}
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
