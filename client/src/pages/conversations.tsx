import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Home, Plus, Search, Upload, FileText } from "lucide-react";
import ConversationCard from "@/components/conversation-card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ConversationWithStats, InsertConversation } from "@shared/schema";

export default function Conversations() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [editingConversation, setEditingConversation] = useState<{ id: number; name: string } | null>(null);
  const [newName, setNewName] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Import states
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'encoding' | 'preview' | 'confirm'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [selectedEncoding, setSelectedEncoding] = useState("UTF-8");
  const [parsedConversations, setParsedConversations] = useState<{
    date: string;
    name: string;
    messages: { text: string; timestamp: string }[];
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: conversations = [], isLoading } = useQuery<ConversationWithStats[]>({
    queryKey: ["/api/conversations"],
  });

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

  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await apiRequest("PATCH", `/api/conversations/${id}`, { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setEditingConversation(null);
      toast({ title: "Conversation updated successfully" });
    },
  });

  const deleteConversationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversation deleted successfully" });
    },
  });

  const handleNewConversation = () => {
    const conversationName = prompt("Enter conversation name:");
    if (conversationName?.trim()) {
      createConversationMutation.mutate({ name: conversationName.trim() });
    }
  };

  const handleCreateTodayTalk = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('en-US', { month: 'long' });
    const year = today.getFullYear();
    const defaultName = `${day} ${month} ${year} Brain talk`;
    
    const conversationName = prompt("Enter conversation name:", defaultName);
    if (conversationName?.trim()) {
      createConversationMutation.mutate({ name: conversationName.trim() });
    }
  };

  const handleEditConversation = (id: number, currentName: string) => {
    setEditingConversation({ id, name: currentName });
    setNewName(currentName);
  };

  const handleUpdateConversation = () => {
    if (editingConversation && newName.trim()) {
      updateConversationMutation.mutate({ id: editingConversation.id, name: newName.trim() });
    }
  };

  const handleDeleteConversation = (id: number) => {
    if (confirm("Are you sure you want to delete this conversation? This action cannot be undone.")) {
      deleteConversationMutation.mutate(id);
    }
  };

  const handleDuplicateConversation = async (id: number) => {
    const originalConversation = conversations.find(c => c.id === id);
    if (originalConversation) {
      const newName = `${originalConversation.name} (Copy)`;
      createConversationMutation.mutate({ name: newName });
    }
  };

  // Import functionality
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    
    // Try to read with UTF-8 first
    try {
      const content = await readFileWithEncoding(file, 'UTF-8');
      setFileContent(content);
      setImportStep('encoding');
    } catch (error) {
      toast({ title: "Error reading file", description: "Please try selecting an encoding", variant: "destructive" });
    }
  };

  const readFileWithEncoding = (file: File, encoding: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      
      if (encoding === 'UTF-8') {
        reader.readAsText(file, 'utf-8');
      } else if (encoding === 'GBK') {
        // For GBK, we'll use UTF-8 but show user that encoding might need adjustment
        reader.readAsText(file, 'gbk');
      } else {
        reader.readAsText(file, encoding.toLowerCase());
      }
    });
  };

  const handleEncodingChange = async (encoding: string) => {
    if (!selectedFile) return;
    
    setSelectedEncoding(encoding);
    try {
      const content = await readFileWithEncoding(selectedFile, encoding);
      setFileContent(content);
    } catch (error) {
      toast({ title: "Error with encoding", description: `Failed to read with ${encoding}`, variant: "destructive" });
    }
  };

  const parseContentByDate = (content: string) => {
    const lines = content.split('\n');
    const conversationsByDate: { [key: string]: { text: string; timestamp: string }[] } = {};
    
    // Date patterns - matching various formats
    const datePatterns = [
      /(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})\s*(AM|PM)?/g,
      /(\d{4})_(\d{1,2})-(\d{1,2})/g,
      /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/g
    ];
    
    let currentDate = '';
    let currentMessage = '';
    
    for (const line of lines) {
      let foundDate = false;
      
      // Check for date patterns
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          // Save previous message if exists
          if (currentDate && currentMessage.trim()) {
            if (!conversationsByDate[currentDate]) {
              conversationsByDate[currentDate] = [];
            }
            conversationsByDate[currentDate].push({
              text: currentMessage.trim(),
              timestamp: new Date().toISOString()
            });
            currentMessage = '';
          }
          
          // Extract new date
          if (match[0].includes('-')) {
            const parts = match[0].split(/[-\s:]/);
            currentDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else if (match[0].includes('_')) {
            const parts = match[0].split(/[_-]/);
            currentDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          }
          
          foundDate = true;
          break;
        }
      }
      
      if (!foundDate && line.trim()) {
        currentMessage += (currentMessage ? '\n' : '') + line;
      }
    }
    
    // Save last message
    if (currentDate && currentMessage.trim()) {
      if (!conversationsByDate[currentDate]) {
        conversationsByDate[currentDate] = [];
      }
      conversationsByDate[currentDate].push({
        text: currentMessage.trim(),
        timestamp: new Date().toISOString()
      });
    }
    
    // Convert to array format
    const conversations = Object.entries(conversationsByDate).map(([date, messages]) => {
      const dateObj = new Date(date);
      const day = dateObj.getDate();
      const month = dateObj.toLocaleString('en-US', { month: 'long' });
      const year = dateObj.getFullYear();
      
      return {
        date,
        name: `${day} ${month} ${year} Talk`,
        messages
      };
    });
    
    return conversations.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const handlePreviewParse = () => {
    if (!fileContent) return;
    
    const conversations = parseContentByDate(fileContent);
    setParsedConversations(conversations);
    setImportStep('preview');
  };

  const handleConfirmImport = async () => {
    setImportStep('confirm');
    
    // Create conversations and messages
    for (const conv of parsedConversations) {
      try {
        // Create conversation
        const response = await apiRequest("POST", "/api/conversations", { name: conv.name });
        const conversation = await response.json();
        
        // Create messages for this conversation
        for (const message of conv.messages) {
          await apiRequest("POST", "/api/messages", {
            conversationId: conversation.id,
            text: message.text
          });
        }
      } catch (error) {
        toast({ 
          title: "Import error", 
          description: `Failed to import conversation: ${conv.name}`, 
          variant: "destructive" 
        });
      }
    }
    
    // Refresh conversations list
    queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    
    // Reset import state
    setShowImportDialog(false);
    setImportStep('upload');
    setSelectedFile(null);
    setFileContent("");
    setParsedConversations([]);
    
    toast({ 
      title: "Import successful", 
      description: `Imported ${parsedConversations.length} conversations` 
    });
  };

  const resetImport = () => {
    setShowImportDialog(false);
    setImportStep('upload');
    setSelectedFile(null);
    setFileContent("");
    setParsedConversations([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredConversations = conversations
    .filter(conv => 
      conv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "recent":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "active":
          return b.messageCount - a.messageCount;
        default:
          return 0;
      }
    });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="gradient-primary-to-secondary text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="hover:bg-white/20 text-white">
                  <Home className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">My Conversations</h1>
                <p className="text-purple-200">
                  {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-white text-primary hover:bg-gray-100"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Import to Start
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Import Conversations from File</DialogTitle>
                  </DialogHeader>
                  
                  {importStep === 'upload' && (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        Import HTML or TXT files with dated content to create daily conversations.
                      </div>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".html,.txt,.htm"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                        <Button 
                          onClick={() => fileInputRef.current?.click()}
                          variant="outline"
                        >
                          Select HTML or TXT File
                        </Button>
                        <p className="text-sm text-gray-500 mt-2">
                          Supports HTML and TXT files with date timestamps
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {importStep === 'encoding' && (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        Select the character encoding for your file:
                      </div>
                      <Select value={selectedEncoding} onValueChange={handleEncodingChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTF-8">UTF-8 (Unicode)</SelectItem>
                          <SelectItem value="GBK">GBK (Chinese Simplified)</SelectItem>
                          <SelectItem value="GB2312">GB2312 (Chinese Simplified)</SelectItem>
                          <SelectItem value="Big5">Big5 (Chinese Traditional)</SelectItem>
                          <SelectItem value="ISO-8859-1">ISO-8859-1 (Latin-1)</SelectItem>
                          <SelectItem value="Windows-1252">Windows-1252</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {fileContent && (
                        <div className="mt-4">
                          <div className="text-sm font-medium mb-2">Preview:</div>
                          <div className="bg-gray-100 p-3 rounded max-h-40 overflow-y-auto text-sm">
                            {fileContent.substring(0, 500)}
                            {fileContent.length > 500 && '...'}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex gap-2">
                        <Button onClick={handlePreviewParse}>
                          Parse Dates & Preview
                        </Button>
                        <Button variant="outline" onClick={resetImport}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {importStep === 'preview' && (
                    <div className="space-y-4">
                      <div className="text-sm text-gray-600">
                        Found {parsedConversations.length} daily conversations:
                      </div>
                      
                      <div className="space-y-3 max-h-60 overflow-y-auto">
                        {parsedConversations.map((conv, index) => (
                          <Card key={index} className="p-3">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-medium">{conv.name}</h4>
                              <Badge variant="secondary">
                                {conv.messages.length} messages
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600">
                              Date: {conv.date}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              First message: {conv.messages[0]?.text.substring(0, 100)}...
                            </div>
                          </Card>
                        ))}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button onClick={handleConfirmImport}>
                          Import All Conversations
                        </Button>
                        <Button variant="outline" onClick={() => setImportStep('encoding')}>
                          Back
                        </Button>
                        <Button variant="outline" onClick={resetImport}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {importStep === 'confirm' && (
                    <div className="space-y-4 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <div className="text-sm text-gray-600">
                        Importing conversations...
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
              
              <Button 
                onClick={handleCreateTodayTalk}
                disabled={createConversationMutation.isPending}
                className="bg-white text-primary hover:bg-gray-100"
              >
                <Plus className="mr-2 h-4 w-4" />
                Today Talk
              </Button>
              <Button 
                onClick={handleNewConversation}
                disabled={createConversationMutation.isPending}
                className="bg-white text-primary hover:bg-gray-100"
              >
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Recent</SelectItem>
                  <SelectItem value="active">Most Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Conversations Grid */}
        {filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <div>
                <p className="text-gray-500 mb-4">No conversations match your search.</p>
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-gray-500 mb-4">No conversations yet.</p>
                <Button onClick={handleNewConversation}>
                  <Plus className="mr-2 h-4 w-4" />
                  Start your first conversation
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredConversations.map((conversation) => (
              <ConversationCard 
                key={conversation.id} 
                conversation={conversation}
                onEdit={handleEditConversation}
                onDuplicate={handleDuplicateConversation}
                onDelete={handleDeleteConversation}
              />
            ))}
          </div>
        )}

        {/* Edit Conversation Dialog */}
        <Dialog open={editingConversation !== null} onOpenChange={() => setEditingConversation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Conversation Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter conversation name"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateConversation()}
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingConversation(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateConversation}
                  disabled={!newName.trim() || updateConversationMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
