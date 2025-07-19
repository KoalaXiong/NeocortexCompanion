import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, FileText, FileDown, Plus, Link as LinkIcon, Palette, RefreshCw } from "lucide-react";
import BubbleCard from "@/components/bubble-card";
import { apiRequest } from "@/lib/queryClient";
import type { BubbleWithMessage, InsertBubble } from "@shared/schema";

export default function Bubbles() {
  const { conversationId } = useParams();
  const id = conversationId ? parseInt(conversationId) : null;
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: bubbles = [], isLoading } = useQuery<BubbleWithMessage[]>({
    queryKey: ["/api/conversations", id, "bubbles"],
    enabled: !!id,
  });

  // Create bubbles from messages if they don't exist
  const createBubbleMutation = useMutation({
    mutationFn: async (data: InsertBubble) => {
      const response = await apiRequest("POST", "/api/bubbles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", id, "bubbles"] });
    },
  });

  // Delete bubble mutation
  const deleteBubbleMutation = useMutation({
    mutationFn: async (bubbleId: number) => {
      await apiRequest("DELETE", `/api/bubbles/${bubbleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", id, "bubbles"] });
    },
  });

  // Update bubble position/properties
  const updateBubbleMutation = useMutation({
    mutationFn: async ({ bubbleId, x, y, color, category, title }: { bubbleId: number; x: number; y: number; color?: string; category?: string; title?: string }) => {
      const updates: any = { x, y };
      if (color !== undefined) updates.color = color;
      if (category !== undefined) updates.category = category;
      if (title !== undefined) updates.title = title;
      const response = await apiRequest("PATCH", `/api/bubbles/${bubbleId}`, updates);
      return response.json();
    },
    onMutate: async ({ bubbleId, x, y, color, category, title }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/conversations", id, "bubbles"] });
      
      // Snapshot the previous value
      const previousBubbles = queryClient.getQueryData<BubbleWithMessage[]>(["/api/conversations", id, "bubbles"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<BubbleWithMessage[]>(["/api/conversations", id, "bubbles"], (old) => {
        if (!old) return old;
        return old.map(bubble => 
          bubble.id === bubbleId 
            ? { ...bubble, x, y, ...(color !== undefined && { color }), ...(category !== undefined && { category }), ...(title !== undefined && { title }) }
            : bubble
        );
      });
      
      // Return a context object with the snapshotted value
      return { previousBubbles };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousBubbles) {
        queryClient.setQueryData(["/api/conversations", id, "bubbles"], context.previousBubbles);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", id, "bubbles"] });
    },
  });

  // Get messages to create bubbles from
  const { data: messages = [] } = useQuery({
    queryKey: ["/api/conversations", id, "messages"],
    enabled: !!id,
  });

  // Calculate optimal bubble size based on available space and bubble count
  const calculateOptimalBubbleSize = (totalBubbles: number) => {
    if (totalBubbles === 0) return { width: 280, height: 120, isCompact: false };
    
    // Get exact viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Account for header (approximately 140px) and padding
    const availableWidth = viewportWidth - 40; // 20px padding each side
    const availableHeight = viewportHeight - 180; // 140px header + 40px padding
    
    const gapX = 15;
    const gapY = 15;
    
    // Normal size
    const normalWidth = 280;
    const normalHeight = 120;
    
    // Calculate how many bubbles can fit at normal size
    const maxColsNormal = Math.floor((availableWidth + gapX) / (normalWidth + gapX));
    const maxRowsNormal = Math.floor((availableHeight + gapY) / (normalHeight + gapY));
    const maxBubblesNormal = maxColsNormal * maxRowsNormal;
    
    if (totalBubbles <= maxBubblesNormal && maxBubblesNormal > 0) {
      return {
        width: normalWidth,
        height: normalHeight,
        isCompact: false
      };
    }
    
    // Calculate optimal grid for compact mode
    const aspectRatio = availableWidth / availableHeight;
    const idealCols = Math.ceil(Math.sqrt(totalBubbles * aspectRatio));
    const actualCols = Math.max(1, Math.min(idealCols, Math.floor((availableWidth + gapX) / (100 + gapX))));
    const actualRows = Math.ceil(totalBubbles / actualCols);
    
    // Calculate exact dimensions to fit perfectly
    const compactWidth = Math.floor((availableWidth - (actualCols - 1) * gapX) / actualCols);
    const compactHeight = Math.floor((availableHeight - (actualRows - 1) * gapY) / actualRows);
    
    // Ensure reasonable minimum dimensions
    const finalWidth = Math.max(80, Math.min(compactWidth, 250));
    const finalHeight = Math.max(50, Math.min(compactHeight, 150));
    
    return {
      width: finalWidth,
      height: finalHeight,
      isCompact: true
    };
  };

  // Create bubbles for messages that don't have them with adaptive layout
  const handleCreateBubbles = () => {
    const colors = ["blue", "green", "purple", "orange", "red"];
    const gapX = 20;
    const gapY = 20;
    const startX = 20;
    const startY = 20;

    // Get messages that don't have bubbles and organize them
    const messagesToCreate = messages.filter(message => 
      !bubbles.find(b => b.messageId === message.id)
    );

    // Calculate optimal size based on total number of bubbles (including existing ones)
    const totalBubbles = bubbles.length + messagesToCreate.length;
    const { width: bubbleWidth, height: bubbleHeight, isCompact } = calculateOptimalBubbleSize(totalBubbles);

    // Group messages by keyword, then by conversation order
    const groupedMessages = messagesToCreate.reduce((groups: { [key: string]: typeof messagesToCreate }, message) => {
      const keyword = message.title || "_no_keyword";
      if (!groups[keyword]) groups[keyword] = [];
      groups[keyword].push(message);
      return groups;
    }, {});

    // Sort groups: keyword groups first, then no-keyword group
    const sortedGroups = Object.entries(groupedMessages).sort(([keyA], [keyB]) => {
      if (keyA === "_no_keyword") return 1;
      if (keyB === "_no_keyword") return -1;
      return keyA.localeCompare(keyB);
    });

    // Calculate positions for all bubbles - fill columns top to bottom
    const maxRows = Math.floor((window.innerHeight - 200) / (bubbleHeight + gapY));
    let currentColumn = 0;
    let currentRow = 0;
    let bubbleIndex = 0;

    sortedGroups.forEach(([keyword, groupMessages]) => {
      groupMessages.forEach((message) => {
        const x = startX + currentColumn * (bubbleWidth + gapX);
        const y = startY + currentRow * (bubbleHeight + gapY);

        createBubbleMutation.mutate({
          messageId: message.id,
          x: x,
          y: y,
          width: bubbleWidth,
          height: bubbleHeight,
          category: "", // No default category - let user add manually
          color: colors[bubbleIndex % colors.length],
          title: message.title || "", // Inherit keyword from message
        });

        // Move to next position - fill column first (top to bottom)
        currentRow++;
        if (currentRow >= maxRows) {
          currentRow = 0;
          currentColumn++;
        }
        
        bubbleIndex++;
      });
    });
  };

  // Recreate all bubbles from latest messages
  const handleRecreateBubbles = async () => {
    if (bubbles.length === 0) {
      // If no bubbles exist, just create them
      handleCreateBubbles();
      return;
    }

    // Store current bubbles list since it will change during deletion
    const bubblesToDelete = [...bubbles];
    
    // Delete all existing bubbles one by one with proper callback chain
    let deletedCount = 0;
    
    const deleteAndCreate = () => {
      if (deletedCount < bubblesToDelete.length) {
        const bubble = bubblesToDelete[deletedCount];
        deleteBubbleMutation.mutate(bubble.id, {
          onSuccess: () => {
            deletedCount++;
            if (deletedCount === bubblesToDelete.length) {
              // All deletions complete, now create new bubbles
              console.log("All bubbles deleted, creating new ones...");
              createNewBubbles();
            } else {
              // Delete next bubble
              deleteAndCreate();
            }
          },
          onError: (error) => {
            console.error("Failed to delete bubble:", error);
            deletedCount++;
            if (deletedCount === bubblesToDelete.length) {
              createNewBubbles();
            } else {
              deleteAndCreate();
            }
          }
        });
      }
    };

    const createNewBubbles = () => {
      const colors = ["blue", "green", "purple", "orange", "red"];
      const gapX = 20;
      const gapY = 20;
      const startX = 20;
      const startY = 20;

      // Calculate optimal size based on total number of messages
      const { width: bubbleWidth, height: bubbleHeight, isCompact } = calculateOptimalBubbleSize(messages.length);

      // Group messages by keyword, then by conversation order
      const groupedMessages = messages.reduce((groups: { [key: string]: typeof messages }, message) => {
        const keyword = message.title || "_no_keyword";
        if (!groups[keyword]) groups[keyword] = [];
        groups[keyword].push(message);
        return groups;
      }, {});

      // Sort groups: keyword groups first, then no-keyword group
      const sortedGroups = Object.entries(groupedMessages).sort(([keyA], [keyB]) => {
        if (keyA === "_no_keyword") return 1;
        if (keyB === "_no_keyword") return -1;
        return keyA.localeCompare(keyB);
      });

      // Calculate grid layout to ensure everything fits in viewport
      const viewportHeight = window.innerHeight;
      const availableHeight = viewportHeight - 180; // Account for header
      const maxRows = Math.floor((availableHeight + gapY) / (bubbleHeight + gapY));
      
      let currentColumn = 0;
      let currentRow = 0;
      let bubbleIndex = 0;

      sortedGroups.forEach(([keyword, groupMessages]) => {
        groupMessages.forEach((message) => {
          console.log(`Creating bubble for message ${message.id} with title: ${message.title}`);
          
          const x = startX + currentColumn * (bubbleWidth + gapX);
          const y = startY + currentRow * (bubbleHeight + gapY);

          createBubbleMutation.mutate({
            messageId: message.id,
            x: x,
            y: y,
            width: bubbleWidth,
            height: bubbleHeight,
            category: "", // No default category - let user add manually
            color: colors[bubbleIndex % colors.length],
            title: message.title || "", // Inherit keyword from message
          });

          // Move to next position - fill column first (top to bottom)
          currentRow++;
          if (currentRow >= maxRows) {
            currentRow = 0;
            currentColumn++;
          }
          
          bubbleIndex++;
        });
      });
    };

    deleteAndCreate();
  };

  const handleBubbleColorChange = (bubbleId: number, newColor: string) => {
    const bubble = bubbles.find(b => b.id === bubbleId);
    if (bubble) {
      updateBubbleMutation.mutate({ 
        bubbleId, 
        x: bubble.x, 
        y: bubble.y, 
        color: newColor 
      });
    }
  };

  const handleBubbleCategoryChange = (bubbleId: number, newCategory: string) => {
    const bubble = bubbles.find(b => b.id === bubbleId);
    if (bubble) {
      updateBubbleMutation.mutate({ 
        bubbleId, 
        x: bubble.x, 
        y: bubble.y, 
        category: newCategory 
      });
    }
  };

  const handleBubbleTitleChange = (bubbleId: number, newTitle: string) => {
    const bubble = bubbles.find(b => b.id === bubbleId);
    if (bubble) {
      updateBubbleMutation.mutate({ 
        bubbleId, 
        x: bubble.x, 
        y: bubble.y, 
        title: newTitle 
      });
    }
  };

  const handleBubbleMove = (bubbleId: number, x: number, y: number) => {
    updateBubbleMutation.mutate({ bubbleId, x, y });
  };

  const handleSaveLayout = () => {
    // Since layout is automatically saved when bubbles are moved,
    // we just provide user feedback about the current state
    if (bubbles.length === 0) {
      alert("No bubbles to save. Create bubbles first!");
      return;
    }
    
    // Check if any bubbles have been moved from their default positions
    const hasMoved = bubbles.some(bubble => bubble.x !== 100 || bubble.y !== 100);
    if (hasMoved) {
      alert("Layout saved successfully! All bubble positions have been saved to the database.");
    } else {
      alert("Layout saved! Your bubble positions are automatically saved as you move them.");
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bubbles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col gradient-purple-blue bubbles-page" style={{ overflow: 'hidden', width: '100vw', height: '100vh' }}>
      {/* Bubbles Header */}
      <div className="gradient-primary-to-secondary text-white px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/chat/${id}`)}
              className="hover:bg-white/20 text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold">Bubble Organization</h2>
              <p className="text-sm text-purple-200">Organize your thoughts spatially</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleRecreateBubbles}
              variant="ghost"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
              disabled={messages.length === 0}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recreate Bubbles
            </Button>
            <Button
              onClick={handleSaveLayout}
              variant="ghost"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Layout
            </Button>
            <Button
              onClick={() => setLocation(`/article/${id}`)}
              size="sm"
              className="bg-white text-primary hover:bg-gray-100"
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Article
            </Button>
            <Button
              onClick={() => window.open(`/api/export-pdf/${id}`, '_blank')}
              size="sm"
              className="bg-yellow-400 text-yellow-900 hover:bg-yellow-300"
            >
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 relative" style={{ overflow: 'hidden' }}>
        <div 
          ref={canvasRef}
          className="absolute inset-0 bubble-canvas"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            overflow: 'hidden',
            width: '100%',
            height: '100%',
            padding: '10px',
            boxSizing: 'border-box'
          }}
        >
          {bubbles.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600 mb-4">No bubbles created yet.</p>
                <Button onClick={handleCreateBubbles}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Bubbles from Messages
                </Button>
              </div>
            </div>
          ) : (
            bubbles.map((bubble) => {
              // Check if this bubble is in compact mode based on its size
              const normalWidth = 280;
              const isCompactMode = bubble.width < normalWidth;
              
              return (
                <BubbleCard
                  key={bubble.id}
                  bubble={bubble}
                  onMove={handleBubbleMove}
                  onColorChange={handleBubbleColorChange}
                  onCategoryChange={handleBubbleCategoryChange}
                  onTitleChange={handleBubbleTitleChange}
                  isCompact={isCompactMode}
                />
              );
            })
          )}
        </div>

        {/* Floating Tools */}
        <div className="absolute bottom-6 right-6 space-y-3">
          <Button
            onClick={handleCreateBubbles}
            size="sm"
            className="bg-white bubble-shadow rounded-2xl p-3 hover:bubble-shadow-lg text-gray-600 hover:text-primary"
            variant="ghost"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            className="bg-white bubble-shadow rounded-2xl p-3 hover:bubble-shadow-lg text-gray-600 hover:text-primary"
            variant="ghost"
          >
            <LinkIcon className="h-5 w-5" />
          </Button>
          <Button
            size="sm"
            className="bg-white bubble-shadow rounded-2xl p-3 hover:bubble-shadow-lg text-gray-600 hover:text-primary"
            variant="ghost"
          >
            <Palette className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
