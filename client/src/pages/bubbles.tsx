import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Save, FileText, FileDown, Plus, Link as LinkIcon, Palette, RefreshCw, Grid3X3 } from "lucide-react";
import BubbleCard from "@/components/bubble-card";
import { apiRequest } from "@/lib/queryClient";
import type { BubbleWithMessage, InsertBubble } from "@shared/schema";

export default function Bubbles() {
  const { conversationId } = useParams();
  const id = conversationId ? parseInt(conversationId) : null;
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  
  // Connection state
  const [isConnectMode, setIsConnectMode] = useState(false);
  const [selectedBubbles, setSelectedBubbles] = useState<number[]>([]);
  const [connections, setConnections] = useState<Array<{id: string; from: number; to: number}>>([]);

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
    mutationFn: async ({ bubbleId, x, y, color, category, title, width, height }: { bubbleId: number; x: number; y: number; color?: string; category?: string; title?: string; width?: number; height?: number }) => {
      const updates: any = { x, y };
      if (color !== undefined) updates.color = color;
      if (category !== undefined) updates.category = category;
      if (title !== undefined) updates.title = title;
      if (width !== undefined) updates.width = width;
      if (height !== undefined) updates.height = height;
      const response = await apiRequest("PATCH", `/api/bubbles/${bubbleId}`, updates);
      return response.json();
    },
    onMutate: async ({ bubbleId, x, y, color, category, title, width, height }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["/api/conversations", id, "bubbles"] });
      
      // Snapshot the previous value
      const previousBubbles = queryClient.getQueryData<BubbleWithMessage[]>(["/api/conversations", id, "bubbles"]);
      
      // Optimistically update to the new value
      queryClient.setQueryData<BubbleWithMessage[]>(["/api/conversations", id, "bubbles"], (old) => {
        if (!old) return old;
        return old.map(bubble => 
          bubble.id === bubbleId 
            ? { 
                ...bubble, 
                x, 
                y, 
                ...(color !== undefined && { color }), 
                ...(category !== undefined && { category }), 
                ...(title !== undefined && { title }),
                ...(width !== undefined && { width }),
                ...(height !== undefined && { height })
              }
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
    
    const availableWidth = window.innerWidth - 60; // Account for margins and potential scrollbar
    const availableHeight = window.innerHeight - 220; // Account for header and bottom space
    const gapX = 20;
    const gapY = 20;
    
    // Normal size
    const normalWidth = 280;
    const normalHeight = 120;
    
    // Calculate how many bubbles can fit at normal size
    const maxColsNormal = Math.floor(availableWidth / (normalWidth + gapX));
    const maxRowsNormal = Math.floor(availableHeight / (normalHeight + gapY));
    const maxBubblesNormal = maxColsNormal * maxRowsNormal;
    
    if (totalBubbles <= maxBubblesNormal) {
      return {
        width: normalWidth,
        height: normalHeight,
        isCompact: false
      };
    }
    
    // Need compact mode - calculate exact grid dimensions
    const idealCols = Math.ceil(Math.sqrt(totalBubbles * (availableWidth / availableHeight)));
    const actualCols = Math.max(1, Math.min(idealCols, Math.floor(availableWidth / (120 + gapX))));
    const actualRows = Math.ceil(totalBubbles / actualCols);
    
    // Calculate exact dimensions to fit perfectly
    const compactWidth = Math.floor((availableWidth - (actualCols - 1) * gapX) / actualCols);
    const compactHeight = Math.floor((availableHeight - (actualRows - 1) * gapY) / actualRows);
    
    // Ensure minimum dimensions
    const finalWidth = Math.max(100, Math.min(compactWidth, 200));
    const finalHeight = Math.max(50, Math.min(compactHeight, 100));
    
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

      // Calculate positions for all bubbles - fill columns top to bottom
      const maxRows = Math.floor((window.innerHeight - 200) / (bubbleHeight + gapY));
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

  const handleAlignBubbles = () => {
    if (bubbles.length === 0) {
      alert("No bubbles to align. Create bubbles first!");
      return;
    }

    const gapX = 20;
    const gapY = 20;
    const startX = 20;
    const startY = 20;

    // Calculate optimal size for current bubble count
    const { width: bubbleWidth, height: bubbleHeight } = calculateOptimalBubbleSize(bubbles.length);

    // Sort bubbles by their current spatial position to preserve user arrangement
    // Sort by column first (x position), then by row (y position)
    const spatialSortedBubbles = [...bubbles].sort((a, b) => {
      // Group into columns based on x position (with some tolerance for alignment)
      const columnA = Math.round(a.x / 300); // Approximate column based on x position
      const columnB = Math.round(b.x / 300);
      
      if (columnA !== columnB) {
        return columnA - columnB; // Sort by column first
      }
      
      // Within same column, sort by y position (top to bottom)
      return a.y - b.y;
    });

    // Calculate max rows that fit in visible space
    const availableHeight = window.innerHeight - 220;
    const maxRows = Math.floor(availableHeight / (bubbleHeight + gapY));
    
    let currentColumn = 0;
    let currentRow = 0;

    // Align all bubbles to grid positions maintaining spatial sequence
    spatialSortedBubbles.forEach((bubble) => {
      const x = startX + currentColumn * (bubbleWidth + gapX);
      const y = startY + currentRow * (bubbleHeight + gapY);

      // Update bubble position and size
      updateBubbleMutation.mutate({
        bubbleId: bubble.id,
        x: x,
        y: y,
        width: bubbleWidth,
        height: bubbleHeight,
      });

      // Move to next position - fill column first (top to bottom)
      currentRow++;
      if (currentRow >= maxRows) {
        currentRow = 0;
        currentColumn++;
      }
    });

    alert("Bubbles aligned to grid layout preserving your arrangement!");
  };

  const handleConnectMode = () => {
    setIsConnectMode(!isConnectMode);
    setSelectedBubbles([]);
    if (!isConnectMode) {
      alert("Connection mode activated! Click two bubbles to connect them.");
    } else {
      alert("Connection mode deactivated.");
    }
  };

  const handleBubbleDoubleClick = (bubbleId: number) => {
    if (!isConnectMode) return;
    
    if (selectedBubbles.includes(bubbleId)) {
      // Deselect if already selected
      setSelectedBubbles(prev => prev.filter(id => id !== bubbleId));
      return;
    }
    
    if (selectedBubbles.length === 0) {
      // Select first bubble
      setSelectedBubbles([bubbleId]);
    } else if (selectedBubbles.length === 1) {
      // Select second bubble and create connection
      const fromBubble = selectedBubbles[0];
      const toBubble = bubbleId;
      
      // Check if connection already exists
      const connectionExists = connections.some(
        conn => (conn.from === fromBubble && conn.to === toBubble) || 
                (conn.from === toBubble && conn.to === fromBubble)
      );
      
      if (!connectionExists) {
        const newConnection = {
          id: `${fromBubble}-${toBubble}`,
          from: fromBubble,
          to: toBubble
        };
        setConnections(prev => [...prev, newConnection]);
      }
      
      setSelectedBubbles([]);
    } else {
      // Reset selection if more than 2 somehow
      setSelectedBubbles([bubbleId]);
    }
  };

  const handleBubbleClick = (bubbleId: number) => {
    if (!isConnectMode) return;
    
    // Check if this bubble is part of an existing connection
    const existingConnection = connections.find(
      conn => conn.from === bubbleId || conn.to === bubbleId
    );
    
    if (existingConnection) {
      // Remove the connection
      setConnections(prev => prev.filter(conn => conn.id !== existingConnection.id));
    }
  };

  const renderConnections = () => {
    return connections.map(connection => {
      const fromBubble = bubbles.find(b => b.id === connection.from);
      const toBubble = bubbles.find(b => b.id === connection.to);
      
      if (!fromBubble || !toBubble) return null;
      
      // Calculate center points of bubbles
      const fromX = fromBubble.x + fromBubble.width / 2;
      const fromY = fromBubble.y + fromBubble.height / 2;
      const toX = toBubble.x + toBubble.width / 2;
      const toY = toBubble.y + toBubble.height / 2;
      
      // Calculate arrow direction
      const angle = Math.atan2(toY - fromY, toX - fromX);
      const arrowLength = 12;
      const arrowAngle = Math.PI / 6; // 30 degrees
      
      // Arrow tip position (slightly inset from bubble edge)
      const tipX = toX - Math.cos(angle) * 20;
      const tipY = toY - Math.sin(angle) * 20;
      
      // Arrow head points
      const arrowHead1X = tipX - arrowLength * Math.cos(angle - arrowAngle);
      const arrowHead1Y = tipY - arrowLength * Math.sin(angle - arrowAngle);
      const arrowHead2X = tipX - arrowLength * Math.cos(angle + arrowAngle);
      const arrowHead2Y = tipY - arrowLength * Math.sin(angle + arrowAngle);
      
      return (
        <svg
          key={connection.id}
          className="absolute inset-0 pointer-events-none"
          style={{ zIndex: 0 }}
        >
          {/* Main line */}
          <line
            x1={fromX}
            y1={fromY}
            x2={tipX}
            y2={tipY}
            stroke="#7C3AED"
            strokeWidth="3"
            opacity="0.8"
          />
          
          {/* Arrow head */}
          <polygon
            points={`${tipX},${tipY} ${arrowHead1X},${arrowHead1Y} ${arrowHead2X},${arrowHead2Y}`}
            fill="#7C3AED"
            opacity="0.8"
          />
          
          {/* Start circle */}
          <circle
            cx={fromX}
            cy={fromY}
            r="5"
            fill="#7C3AED"
            opacity="0.8"
          />
        </svg>
      );
    });
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
    <div className="h-screen flex flex-col gradient-purple-blue">
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
      <div className="flex-1 relative overflow-hidden">
        <div 
          ref={canvasRef}
          className="absolute inset-0 p-4 overflow-hidden"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            width: "100vw",
            height: "calc(100vh - 140px)",
            maxWidth: "100%",
            maxHeight: "100%"
          }}
        >
          {/* Render connections behind bubbles */}
          {renderConnections()}
          
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
              const isSelected = selectedBubbles.includes(bubble.id);
              
              return (
                <BubbleCard
                  key={bubble.id}
                  bubble={bubble}
                  onMove={handleBubbleMove}
                  onColorChange={handleBubbleColorChange}
                  onCategoryChange={handleBubbleCategoryChange}
                  onTitleChange={handleBubbleTitleChange}
                  isCompact={isCompactMode}
                  isConnectMode={isConnectMode}
                  isSelected={isSelected}
                  onBubbleClick={handleBubbleClick}
                  onBubbleDoubleClick={handleBubbleDoubleClick}
                />
              );
            })
          )}
        </div>

        {/* Floating Tools */}
        <div className="absolute bottom-6 right-6 space-y-3">
          <Button
            onClick={handleAlignBubbles}
            size="sm"
            className="bg-white bubble-shadow rounded-2xl p-3 hover:bubble-shadow-lg text-gray-600 hover:text-primary"
            variant="ghost"
            title="Align bubbles in grid layout"
          >
            <Grid3X3 className="h-5 w-5" />
          </Button>
          <Button
            onClick={handleConnectMode}
            size="sm"
            className={`bubble-shadow rounded-2xl p-3 hover:bubble-shadow-lg ${
              isConnectMode 
                ? 'bg-purple-500 text-white' 
                : 'bg-white text-gray-600 hover:text-primary'
            }`}
            variant="ghost"
            title="Connect bubbles to show relationships"
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
