import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home, Plus, Search } from "lucide-react";
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
