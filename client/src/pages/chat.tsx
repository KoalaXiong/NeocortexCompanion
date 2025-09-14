import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Send, Workflow, Lightbulb, Copy, Move, Plus, Languages } from "lucide-react";
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
  const [showBilingualDialog, setShowBilingualDialog] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState("zh");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [isTranslating, setIsTranslating] = useState(false);
  const isUserAction = useRef(false);
  const lastMessageCount = useRef(0);
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

  // Create message mutation (for splitting)
  const createMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const response = await apiRequest("POST", "/api/messages", messageData);
      if (!response.ok) {
        throw new Error('Failed to create message');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error) => {
      console.error('Failed to create message:', error);
    }
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

  // Update message mutation without conflicting optimistic updates
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      const response = await apiRequest("PATCH", `/api/messages/${id}`, { text });
      if (!response.ok) {
        throw new Error('Failed to update message');
      }
      return response.json();
    },
    onSuccess: (updatedMessage) => {
      // Immediately update the cache with server response
      queryClient.setQueryData(
        ["/api/conversations", conversationId, "messages"],
        (oldData: any[]) => {
          if (!oldData) return oldData;
          return oldData.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          );
        }
      );
      
      // Force immediate refetch to ensure UI consistency
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error) => {
      console.error('Failed to update message:', error);
      // Refetch on error to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
    }
  });

  // Delete message mutation with preserved scroll position
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest("DELETE", `/api/messages/${messageId}`);
      if (!response.ok) {
        throw new Error('Failed to delete message');
      }
      return messageId;
    },
    onMutate: async (messageId: number) => {
      // Save current scroll position before deletion
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const savedPosition = container.scrollTop;
        
        // Store scroll position in a ref that won't trigger re-renders
        container.setAttribute('data-saved-scroll', savedPosition.toString());
      }

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(["/api/conversations", conversationId, "messages"]);
      
      // Optimistically update cache immediately (before server response)
      queryClient.setQueryData(
        ["/api/conversations", conversationId, "messages"],
        (oldData: any[]) => {
          if (!oldData) return oldData;
          return oldData.filter(msg => msg.id !== messageId);
        }
      );
      
      // Return context object with snapshot value
      return { previousMessages };
    },
    onError: (error, messageId, context) => {
      // If mutation fails, rollback to previous state
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["/api/conversations", conversationId, "messages"],
          context.previousMessages
        );
      }
      console.error('Failed to delete message:', error);
    },
    onSuccess: () => {
      // Don't restore scroll position here - let the useEffect handle it after refetch
      // The data-saved-scroll attribute will be processed by useEffect after invalidateQueries
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    }
  });

  useEffect(() => {
    // Check if we have a saved scroll position (from deletion, translation, or other operations)
    const hasSavedScroll = messagesContainerRef.current?.hasAttribute('data-saved-scroll');
    
    if (hasSavedScroll) {
      // Restore saved scroll position
      const container = messagesContainerRef.current;
      const savedPosition = container?.getAttribute('data-saved-scroll');
      if (savedPosition && container) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (container) {
              container.scrollTop = parseInt(savedPosition);
              container.removeAttribute('data-saved-scroll');
            }
          });
        });
      }
    } else {
      // Only auto-scroll when messages are added (not deleted, edited, or translated)
      const messageAdded = messages.length > lastMessageCount.current;
      lastMessageCount.current = messages.length;
      
      if (messageAdded && messages.length > 0) {
        // Small delay to ensure DOM has rendered
        setTimeout(() => {
          if (!messagesContainerRef.current?.hasAttribute('data-saved-scroll') && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
          }
        }, 50);
      }
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
    // Update message text in the database
    updateMessageMutation.mutate({ 
      id: messageId, 
      text: newText.trim() 
    });
  };

  const handleMessageDelete = (messageId: number) => {
    if (confirm('Are you sure you want to delete this message?')) {
      deleteMessageMutation.mutate(messageId);
    }
  };

  const handleMessageSplit = async (messageId: number) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      // Split message by line breaks, filter out empty lines
      const parts = message.text.split('\n').filter(part => part.trim().length > 0);
      
      if (parts.length <= 1) {
        alert('Message cannot be split - no line breaks found or only one non-empty part.');
        return;
      }

      if (!confirm(`Split this message into ${parts.length} separate messages?`)) {
        return;
      }

      // Get the original message timestamp and create incremental timestamps
      const originalTime = new Date(message.createdAt);
      
      // Update the original message with the first part
      await updateMessageMutation.mutateAsync({
        id: messageId,
        text: parts[0].trim()
      });

      // Create new messages for the remaining parts with sequential timestamps
      for (let i = 1; i < parts.length; i++) {
        // Add a few milliseconds to each subsequent message to maintain order
        const newTimestamp = new Date(originalTime.getTime() + (i * 100));
        
        // Use direct API call to set custom timestamp
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: message.conversationId,
            text: parts[i].trim(),
            title: message.title || "",
            createdAt: newTimestamp.toISOString()
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create message ${i}`);
        }
      }

      // Refresh the messages list to show them in correct order
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
    } catch (error) {
      console.error('Failed to split message:', error);
      alert('Failed to split message. Please try again.');
    }
  };

  // Translation service using Google Translate
  const translateText = async (text: string, from: string, to: string): Promise<string> => {
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
      const data = await response.json();
      return data[0][0][0] || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  };

  const handleBilingualTranslation = async () => {
    if (!conversationId || selectedMessages.size === 0) return;
    
    // Save scroll position before translation
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const savedPosition = container.scrollTop;
      container.setAttribute('data-saved-scroll', savedPosition.toString());
    }
    
    setIsTranslating(true);
    try {
      // Get selected messages that are eligible for translation
      const selectedMessagesList = messages.filter(message => selectedMessages.has(message.id));
      
      // Filter to only original messages in the source language
      const originalMessages = selectedMessagesList.filter(message => {
        // Skip messages that start with language prefixes like [English], [Italian], etc
        const hasLanguagePrefix = /^\[[\w\s]+\]/.test(message.text);
        // Skip messages that are translations (have translatedFrom field)
        const isTranslation = message.translatedFrom != null;
        // Skip messages that don't match the source language
        const messageLanguage = message.originalLanguage || 
          (/[\u4e00-\u9fff]/.test(message.text) ? 'zh' : 
           /[a-zA-Z]/.test(message.text) ? 'en' : null);
        const matchesSourceLanguage = messageLanguage === sourceLanguage;
        
        return !hasLanguagePrefix && !isTranslation && matchesSourceLanguage;
      });

      if (originalMessages.length === 0) {
        alert(`No eligible messages found for translation from ${getLanguageName(sourceLanguage)} to ${getLanguageName(targetLanguage)}.`);
        setShowBilingualDialog(false);
        setIsTranslating(false);
        // Remove saved scroll position if operation is cancelled
        if (messagesContainerRef.current) {
          messagesContainerRef.current.removeAttribute('data-saved-scroll');
        }
        return;
      }

      // Check if any of the selected messages already have translations in target language
      const selectedMessageIds = originalMessages.map(m => m.id);
      const existingTranslations = messages.filter(message => 
        selectedMessageIds.some(id => message.translatedFrom === id) &&
        (message.text.startsWith(`[${getLanguageName(targetLanguage)}]`) || 
         detectTranslationLanguage(message.text) === targetLanguage)
      );
      
      if (existingTranslations.length > 0) {
        if (!confirm(`Some selected messages already have ${getLanguageName(targetLanguage)} translations. Continue anyway?`)) {
          setShowBilingualDialog(false);
          setIsTranslating(false);
          // Remove saved scroll position if operation is cancelled
          if (messagesContainerRef.current) {
            messagesContainerRef.current.removeAttribute('data-saved-scroll');
          }
          return;
        }
      }

      for (const message of originalMessages) {
        // Translate the message text without any language prefixes
        const translatedText = await translateText(message.text, sourceLanguage, targetLanguage);
        
        // Create translation message with timestamp just after original
        const originalTime = new Date(message.createdAt);
        const translationTimestamp = new Date(originalTime.getTime() + 50); // 50ms after original

        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: message.conversationId,
            text: translatedText, // No language prefix in content
            title: message.title ? `${message.title} (${getLanguageName(targetLanguage)})` : "",
            originalLanguage: null, // Mark as translation
            translatedFrom: message.id, // Reference to original message
            createdAt: translationTimestamp.toISOString()
          }),
        });

        if (!response.ok) {
          console.error(`Failed to create translation for message ${message.id}`);
        }
      }

      // Don't restore scroll position here - let the useEffect handle it after refetch
      // The data-saved-scroll attribute will be processed by useEffect after invalidateQueries

      // Refresh messages
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      setShowBilingualDialog(false);
      
      // Clear selection after translation
      clearSelection();
    } catch (error) {
      console.error('Failed to translate selected messages:', error);
      alert('Failed to translate selected messages. Please try again.');
      // Remove saved scroll position on error
      if (messagesContainerRef.current) {
        messagesContainerRef.current.removeAttribute('data-saved-scroll');
      }
    } finally {
      setIsTranslating(false);
    }
  };

  const getLanguageName = (code: string): string => {
    const languages: Record<string, string> = {
      'zh': 'Chinese',
      'en': 'English', 
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'es': 'Spanish',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ar': 'Arabic'
    };
    return languages[code] || code;
  };

  const detectTranslationLanguage = (text: string): string => {
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[à-ÿÀ-ß]/.test(text)) return 'it'; // Basic Italian detection
    return 'en'; // Default to English
  };

  const updateMessageTitle = async (messageId: number, title: string) => {
    try {
      // Mark as user action to prevent auto-scroll
      isUserAction.current = true;
      
      await apiRequest("PATCH", `/api/messages/${messageId}`, { title });
      // Refresh messages to show the updated title
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", conversationId, "messages"] });
      
      // Reset user action flag after short delay
      setTimeout(() => {
        isUserAction.current = false;
      }, 300);
    } catch (error) {
      console.error("Error updating message title:", error);
      isUserAction.current = false;
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

  const detectMessageLanguage = (text: string): string | null => {
    // Chinese detection
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    
    // Italian detection - check for common Italian patterns
    if (/[àèéìíîòóùúûü]/.test(text.toLowerCase()) || 
        /\b(quello|questo|essere|molto|tutto|anche|fare|dire|dove|come|quando|perché|cosa|dovrebbe|persone|normali)\b/i.test(text)) {
      return 'it';
    }
    
    // Default to English for other Latin scripts
    if (/[a-zA-Z]/.test(text)) return 'en';
    
    return null;
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    if (!conversationId) {
      // Create new conversation first
      const name = conversationName.trim() || "New Conversation";
      createConversationMutation.mutate({ name });
      return;
    }

    // Detect the language of the new message
    const detectedLanguage = detectMessageLanguage(message.trim());

    sendMessageMutation.mutate({
      conversationId,
      text: message.trim(),
      originalLanguage: detectedLanguage, // Set the original language for new user messages
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBilingualDialog(true)}
                disabled={selectedMessages.size === 0}
              >
                <Languages className="h-4 w-4 mr-1" />
                Translate
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
                onMessageDelete={handleMessageDelete}
                onMessageSplit={handleMessageSplit}
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

      {/* Translate Selected Messages Dialog */}
      <Dialog open={showBilingualDialog} onOpenChange={setShowBilingualDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Translate Selected Messages</DialogTitle>
            <DialogDescription>
              Add translations for the {selectedMessages.size} selected message{selectedMessages.size !== 1 ? 's' : ''}. Translations will appear right after each original message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">From Language (Auto-detected)</label>
              <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">To Language</label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="zh">Chinese</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="it">Italian</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                  <SelectItem value="ru">Russian</SelectItem>
                  <SelectItem value="ja">Japanese</SelectItem>
                  <SelectItem value="ko">Korean</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setShowBilingualDialog(false)} 
                variant="outline" 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBilingualTranslation} 
                className="flex-1"
                disabled={isTranslating || sourceLanguage === targetLanguage || selectedMessages.size === 0}
              >
                {isTranslating ? 'Translating...' : `Translate ${selectedMessages.size} Message${selectedMessages.size !== 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
