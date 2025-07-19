import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, FileDown, Tag } from "lucide-react";
import BubbleCard from "@/components/bubble-card";
import PDFPreviewModal from "@/components/pdf-preview-modal";
import { generatePDF } from "@/lib/pdf-generator";
import { apiRequest } from "@/lib/queryClient";
import type { BubbleWithMessage, InsertArticle, Article } from "@shared/schema";

export default function ArticlePage() {
  const { conversationId } = useParams();
  const id = conversationId ? parseInt(conversationId) : null;
  const [, setLocation] = useLocation();
  const [articleTitle, setArticleTitle] = useState("");
  const [articleContent, setArticleContent] = useState("");
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [usedBubbles, setUsedBubbles] = useState<number[]>([]);
  const [currentArticleId, setCurrentArticleId] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<'connection' | 'original' | 'keyword' | 'tag'>('connection');
  const editorRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Load connections from localStorage (same as bubble page)
  const [connections] = useState<Array<{id: string; from: number; to: number}>>(() => {
    if (typeof window !== 'undefined' && id) {
      const stored = localStorage.getItem(`bubbleConnections_${id}`);
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });

  const { data: bubbles = [], isLoading } = useQuery<BubbleWithMessage[]>({
    queryKey: ["/api/conversations", id, "bubbles"],
    enabled: !!id,
  });

  const { data: conversation } = useQuery({
    queryKey: ["/api/conversations", id],
    enabled: !!id,
  });

  // Query for existing articles for this conversation
  const { data: existingArticles = [] } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
    enabled: !!id,
  });

  // Set article title to conversation name when conversation loads
  useEffect(() => {
    if (conversation?.name && !articleTitle) {
      setArticleTitle(conversation.name);
    }
  }, [conversation?.name, articleTitle]);

  // Load existing article draft if available
  useEffect(() => {
    if (existingArticles.length > 0 && !articleContent) {
      const latestArticle = existingArticles
        .filter(article => article.title.includes(conversation?.name || ''))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      
      if (latestArticle) {
        setArticleTitle(latestArticle.title);
        setArticleContent(latestArticle.content);
        setUsedBubbles(latestArticle.bubbleIds);
        setCurrentArticleId(latestArticle.id);
      }
    }
  }, [existingArticles, articleContent, conversation?.name]);

  // Save article mutation - update if exists, create if new
  const saveArticleMutation = useMutation({
    mutationFn: async (data: InsertArticle) => {
      if (currentArticleId) {
        // Update existing article
        const response = await apiRequest("PATCH", `/api/articles/${currentArticleId}`, data);
        return response.json();
      } else {
        // Create new article
        const response = await apiRequest("POST", "/api/articles", data);
        const newArticle = await response.json();
        setCurrentArticleId(newArticle.id);
        return newArticle;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      alert("Article saved successfully!");
    },
  });

  // Helper functions - defined before they're used
  const getColorClasses = (color: string) => {
    const colorClassMap = {
      "blue": { bg: "bg-blue-100", text: "text-blue-700" },
      "green": { bg: "bg-green-100", text: "text-green-700" },
      "purple": { bg: "bg-purple-100", text: "text-purple-700" },
      "orange": { bg: "bg-orange-100", text: "text-orange-700" },
      "red": { bg: "bg-red-100", text: "text-red-700" }
    };
    return colorClassMap[color as keyof typeof colorClassMap] || colorClassMap.blue;
  };

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

  // Connection-aware sorting (same logic as bubble page)
  const getConnectionOrderedBubbles = (bubblesArray: BubbleWithMessage[]) => {
    const visited = new Set<number>();
    const ordered: BubbleWithMessage[] = [];
    const unconnected: BubbleWithMessage[] = [];
    const connectionChains: BubbleWithMessage[][] = [];

    const buildChain = (startBubbleId: number, chain: BubbleWithMessage[] = []): BubbleWithMessage[] => {
      if (visited.has(startBubbleId)) return chain;
      
      const bubble = bubblesArray.find(b => b.id === startBubbleId);
      if (!bubble) return chain;
      
      visited.add(startBubbleId);
      chain.push(bubble);

      const outgoingConnections = connections
        .filter(conn => conn.from === startBubbleId)
        .sort((a, b) => {
          const aTime = parseInt(a.id.split('-').pop() || '0');
          const bTime = parseInt(b.id.split('-').pop() || '0');
          return aTime - bTime;
        });

      if (outgoingConnections.length > 0) {
        const nextBubbleId = outgoingConnections[0].to;
        return buildChain(nextBubbleId, chain);
      }

      return chain;
    };

    // Find starting points for chains
    const startingBubbles = bubblesArray.filter(bubble => {
      const hasIncoming = connections.some(conn => conn.to === bubble.id);
      const hasOutgoing = connections.some(conn => conn.from === bubble.id);
      return hasOutgoing && !hasIncoming;
    });

    // Build chains from starting points
    startingBubbles.forEach(startBubble => {
      if (!visited.has(startBubble.id)) {
        const chain = buildChain(startBubble.id);
        if (chain.length > 0) {
          connectionChains.push(chain);
        }
      }
    });

    // Add remaining connected bubbles
    const remainingConnected = bubblesArray.filter(bubble => {
      const isConnected = connections.some(conn => conn.from === bubble.id || conn.to === bubble.id);
      return isConnected && !visited.has(bubble.id);
    });

    remainingConnected.forEach(bubble => {
      if (!visited.has(bubble.id)) {
        const chain = buildChain(bubble.id);
        if (chain.length > 0) {
          connectionChains.push(chain);
        }
      }
    });

    // Flatten chains
    connectionChains.forEach(chain => {
      ordered.push(...chain);
    });

    // Add unconnected bubbles
    bubblesArray.forEach(bubble => {
      if (!visited.has(bubble.id)) {
        unconnected.push(bubble);
      }
    });

    return [...ordered, ...unconnected];
  };

  // Create connection tags - each connection chain gets a tag with first keyword
  const getConnectionTags = () => {
    const tags: Array<{name: string; bubbleIds: number[]; color: string}> = [];
    const visited = new Set<number>();

    const buildChain = (startBubbleId: number): number[] => {
      const chain: number[] = [];
      let currentId = startBubbleId;
      
      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        chain.push(currentId);
        
        const nextConnection = connections
          .filter(conn => conn.from === currentId)
          .sort((a, b) => {
            const aTime = parseInt(a.id.split('-').pop() || '0');
            const bTime = parseInt(b.id.split('-').pop() || '0');
            return aTime - bTime;
          })[0];
        
        currentId = nextConnection?.to;
      }
      
      return chain;
    };

    // Find chain starting points
    const startingBubbles = bubbles.filter(bubble => {
      const hasIncoming = connections.some(conn => conn.to === bubble.id);
      const hasOutgoing = connections.some(conn => conn.from === bubble.id);
      return hasOutgoing && !hasIncoming;
    });

    startingBubbles.forEach(startBubble => {
      if (!visited.has(startBubble.id)) {
        const chainIds = buildChain(startBubble.id);
        if (chainIds.length > 1) { // Only create tag for chains with multiple bubbles
          const firstBubble = bubbles.find(b => b.id === chainIds[0]);
          const tagName = firstBubble?.title || `Connection ${chainIds[0]}`;
          const colors = ["blue", "green", "purple", "orange", "red"];
          const tagColor = colors[tags.length % colors.length];
          
          tags.push({
            name: tagName,
            bubbleIds: chainIds,
            color: tagColor
          });
        }
      }
    });

    return tags;
  };

  const availableBubbles = bubbles.filter(bubble => !usedBubbles.includes(bubble.id));
  const connectionTags = getConnectionTags();
  
  // Sort bubbles based on current sort mode
  const sortedAvailableBubbles = [...availableBubbles].sort((a, b) => {
    switch (sortMode) {
      case 'connection':
        // Use same logic as bubble page - connected bubbles first, in connection order
        return connections.length > 0 
          ? getConnectionOrderedBubbles(availableBubbles).indexOf(a) - getConnectionOrderedBubbles(availableBubbles).indexOf(b)
          : a.id - b.id;
      case 'keyword':
        const titleA = a.title || '';
        const titleB = b.title || '';
        return titleA.localeCompare(titleB);
      case 'tag':
        return getCategoryLabel(a.category).localeCompare(getCategoryLabel(b.category));
      case 'original':
      default:
        return a.id - b.id;
    }
  });

  const handleBubbleDrop = (bubbleId: number, bubbleText: string) => {
    setUsedBubbles(prev => [...prev, bubbleId]);
    
    const newParagraph = `<p class="mb-4">${bubbleText}</p>`;
    setArticleContent(prev => prev + newParagraph);
  };

  const handleSaveArticle = () => {
    saveArticleMutation.mutate({
      title: articleTitle,
      content: articleContent,
      bubbleIds: usedBubbles,
    });
  };

  const handleExportPDF = () => {
    setShowPDFPreview(true);
  };

  const handleDownloadPDF = () => {
    // Use conversation name as default filename, fallback to article title
    const defaultFilename = conversation?.name || articleTitle;
    generatePDF({
      title: articleTitle,
      content: articleContent,
      filename: `${defaultFilename.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
    });
    setShowPDFPreview(false);
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Editor Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation(`/bubbles/${id}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Article Editor</h2>
              <p className="text-sm text-gray-500">Drag bubbles to build your article</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleSaveArticle}
              disabled={saveArticleMutation.isPending}
              variant="ghost"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Draft
            </Button>
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleExportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Bubbles Panel */}
        <div className="w-1/3 gradient-purple-blue border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Bubbles</h3>
            
            {/* Connection Tags */}
            {connectionTags.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <Tag className="w-4 h-4 mr-1" />
                  Connection Groups
                </h4>
                <div className="flex flex-wrap gap-2">
                  {connectionTags.map((tag, index) => (
                    <Badge 
                      key={index}
                      variant="secondary" 
                      className={`${getColorClasses(tag.color).bg} ${getColorClasses(tag.color).text} cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => {
                        // Add all bubbles from this connection to the article
                        const newUsedBubbles = [...usedBubbles, ...tag.bubbleIds.filter(id => !usedBubbles.includes(id))];
                        setUsedBubbles(newUsedBubbles);
                        
                        // Add tag heading and all bubble content
                        const tagContent = tag.bubbleIds
                          .map(bubbleId => {
                            const bubble = bubbles.find(b => b.id === bubbleId);
                            return bubble ? bubble.content : '';
                          })
                          .filter(content => content)
                          .map(content => `<p class="mb-4">${content}</p>`)
                          .join('');
                        
                        const tagSection = `<h3 class="text-lg font-semibold mb-3">${tag.name}</h3>${tagContent}`;
                        setArticleContent(prev => prev + tagSection);
                      }}
                    >
                      {tag.name} ({tag.bubbleIds.length})
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sorting Controls */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={sortMode === 'connection' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('connection')}
                className="text-xs"
              >
                Connection Order
              </Button>
              <Button
                variant={sortMode === 'keyword' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('keyword')}
                className="text-xs"
              >
                Sort by Keyword
              </Button>
              <Button
                variant={sortMode === 'tag' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('tag')}
                className="text-xs"
              >
                Sort by Tag
              </Button>
              <Button
                variant={sortMode === 'original' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortMode('original')}
                className="text-xs"
              >
                Original Order
              </Button>
            </div>
            
            {availableBubbles.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">All bubbles have been used.</p>
                <Button
                  onClick={() => setUsedBubbles([])}
                  variant="outline"
                  size="sm"
                >
                  Reset Bubbles
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedAvailableBubbles.map((bubble) => (
                  <div
                    key={bubble.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 cursor-grab hover:shadow-md transition-all duration-200 active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", JSON.stringify({
                        id: bubble.id,
                        text: bubble.message.text
                      }));
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {/* Keyword/Title */}
                        {bubble.title && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColorClasses(getCategoryColor(bubble.category)).bg} ${getColorClasses(getCategoryColor(bubble.category)).text}`}>
                            {bubble.title}
                          </span>
                        )}
                        {/* Category tag */}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getColorClasses(getCategoryColor(bubble.category)).bg} ${getColorClasses(getCategoryColor(bubble.category)).text}`}>
                          {getCategoryLabel(bubble.category)}
                        </span>
                      </div>
                      <div className="text-gray-400">⋮⋮</div>
                    </div>
                    <p className="text-gray-800 text-sm leading-relaxed">
                      {bubble.message.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Article Editor */}
        <div className="flex-1 bg-white overflow-y-auto">
          <div className="max-w-4xl mx-auto p-8">
            {/* Article Title */}
            <Input
              value={articleTitle}
              onChange={(e) => setArticleTitle(e.target.value)}
              className="w-full text-3xl font-bold border-none outline-none mb-8 placeholder-gray-400"
              placeholder={conversation?.name || "Article Title"}
            />

            {/* Editor Content */}
            <div className="prose prose-lg max-w-none">
              
              {/* Drop Zone Indicator */}
              <div 
                className="drop-zone border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6 text-center text-gray-500 hover:border-primary hover:text-primary transition-colors"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.add('border-primary', 'text-primary');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('border-primary', 'text-primary');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-primary', 'text-primary');
                  
                  const data = e.dataTransfer.getData("text/plain");
                  if (data) {
                    const bubble = JSON.parse(data);
                    handleBubbleDrop(bubble.id, bubble.text);
                  }
                }}
              >
                <div className="text-2xl mb-2">+</div>
                <p>Drag bubbles here to build your article</p>
              </div>

              {/* Article Content */}
              <div 
                ref={editorRef}
                className="min-h-[400px] space-y-6"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => setArticleContent(e.currentTarget.innerHTML)}
                onBlur={(e) => setArticleContent(e.currentTarget.innerHTML)}
              >
                {articleContent ? (
                  <div dangerouslySetInnerHTML={{ __html: articleContent }} />
                ) : (
                  <div className="text-gray-500 italic">
                    Start writing your article or drag bubbles from the sidebar...
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>
      </div>

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPDFPreview}
        onClose={() => setShowPDFPreview(false)}
        onDownload={handleDownloadPDF}
        title={articleTitle}
        content={articleContent}
      />
    </div>
  );
}
