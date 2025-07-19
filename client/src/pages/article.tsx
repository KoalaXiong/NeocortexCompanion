import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Eye, FileDown, Tag, Bold, Italic, Underline, List, ListOrdered, Type, Minus, Undo, Redo, Hash, Download } from "lucide-react";
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
  const [sortMode, setSortMode] = useState<'connection' | 'original' | 'keyword'>('connection');
  const [wordCount, setWordCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const editorRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();

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

  // Initialize editor content only once and handle bubble drops
  useEffect(() => {
    if (editorRef.current && !editorRef.current.hasAttribute('data-initialized')) {
      // Set initial content or placeholder
      if (articleContent) {
        editorRef.current.innerHTML = articleContent;
      } else {
        editorRef.current.innerHTML = '<div style="color: #9ca3af; font-style: italic;">Start writing your article or drag bubbles from the sidebar...</div>';
      }
      editorRef.current.setAttribute('data-initialized', 'true');
    }
  }, []);

  // Handle content updates from bubble drops specifically
  const handleBubbleDrop = (bubbleId: number, bubbleText: string) => {
    setUsedBubbles(prev => [...prev, bubbleId]);
    
    if (editorRef.current) {
      // Clear placeholder text if present
      const placeholder = editorRef.current.querySelector('[style*="color: #9ca3af"]');
      if (placeholder) {
        editorRef.current.innerHTML = '';
      }
      
      // Add new paragraph
      const newParagraph = document.createElement('p');
      newParagraph.style.marginBottom = '16px';
      newParagraph.style.lineHeight = '1.6';
      newParagraph.textContent = bubbleText;
      
      editorRef.current.appendChild(newParagraph);
      setArticleContent(editorRef.current.innerHTML);
    }
  };

  // Load existing article draft from localStorage first, then database if available
  useEffect(() => {
    if (!articleContent && id) {
      // Try to load from localStorage first
      try {
        const latestDraft = localStorage.getItem('latest_article_draft');
        if (latestDraft) {
          const draft = JSON.parse(latestDraft);
          if (draft.conversationId === id && draft.title && draft.content) {
            setArticleTitle(draft.title);
            setArticleContent(draft.content);
            setAutoSaveStatus('saved');
            return; // Don't load from database if we have a recent draft
          }
        }
      } catch (error) {
        console.error('Failed to load draft from localStorage:', error);
      }

      // Fallback to database if no local draft
      if (existingArticles.length > 0) {
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
    }
  }, [existingArticles, articleContent, conversation?.name, id]);

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
      // Remove popup - manual save still shows success
      setAutoSaveStatus('saved');
    },
    onError: () => {
      setAutoSaveStatus('unsaved');
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
          // Find the first non-empty keyword in the connection chain
          let tagName = '';
          for (const bubbleId of chainIds) {
            const bubble = bubbles.find(b => b.id === bubbleId);
            if (bubble?.title && bubble.title.trim()) {
              tagName = bubble.title;
              break;
            }
          }
          
          // If no keywords found, use generic group name
          if (!tagName) {
            tagName = `Group No.${tags.length + 1}`;
          }
          
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

      case 'original':
      default:
        return a.id - b.id;
    }
  });

  // Word count calculation
  const updateWordCount = (content: string) => {
    const textContent = content.replace(/<[^>]*>/g, '').trim();
    const words = textContent ? textContent.split(/\s+/).length : 0;
    setWordCount(words);
  };

  // Update word count when content changes
  useEffect(() => {
    updateWordCount(articleContent);
  }, [articleContent]);

  // Formatting functions - simplified without cursor position management
  const applyFormat = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
      const newContent = editorRef.current.innerHTML;
      setArticleContent(newContent);
    }
  };

  const insertHeading = (level: number) => {
    if (editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      const selectedText = selection?.toString() || 'Heading';
      
      // Insert heading using document.execCommand for better compatibility
      document.execCommand('formatBlock', false, `h${level}`);
      
      // If no text was selected, insert placeholder text
      if (!selection?.toString()) {
        document.execCommand('insertText', false, selectedText);
      }
      
      setArticleContent(editorRef.current.innerHTML);
    }
  };

  const insertDivider = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertHTML', false, '<hr style="margin: 24px 0; border: none; border-top: 2px solid #e5e7eb; width: 100%;">');
      setArticleContent(editorRef.current.innerHTML);
    }
  };

  // Auto-save to local storage functionality
  const triggerAutoSave = () => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    setAutoSaveStatus('unsaved');
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (articleTitle.trim() || articleContent.trim()) {
        setAutoSaveStatus('saving');
        
        try {
          // Create text content for local storage
          const textContent = articleContent.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
          const fullContent = `${articleTitle}\n${'='.repeat(articleTitle.length)}\n\n${textContent}`;
          
          // Save to localStorage as temporary file
          const timestamp = new Date().toISOString();
          const saveKey = `article_draft_${id}_${timestamp.slice(0, 19).replace(/:/g, '-')}`;
          
          localStorage.setItem(saveKey, fullContent);
          localStorage.setItem('latest_article_draft', JSON.stringify({
            title: articleTitle,
            content: articleContent,
            timestamp,
            conversationId: id
          }));
          
          setAutoSaveStatus('saved');
        } catch (error) {
          console.error('Auto-save failed:', error);
          setAutoSaveStatus('unsaved');
        }
      }
    }, 2000); // Auto-save after 2 seconds of inactivity
  };

  // Trigger auto-save when content changes
  useEffect(() => {
    if (articleContent || articleTitle) {
      triggerAutoSave();
    }
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [articleContent, articleTitle]);

  // Auto-save status text
  const getAutoSaveText = () => {
    switch (autoSaveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Auto-saved';
      case 'unsaved': return 'Unsaved changes';
      default: return 'Auto-saved';
    }
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

  const handleDownloadText = () => {
    // Create plain text version
    const textContent = articleContent.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
    const fullContent = `${articleTitle}\n${'='.repeat(articleTitle.length)}\n\n${textContent}`;
    
    // Create and download text file
    const blob = new Blob([fullContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(conversation?.name || articleTitle).replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              Save to Database
            </Button>
            <Button variant="outline">
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button onClick={handleDownloadText} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download TXT
            </Button>
            <Button onClick={handleExportPDF}>
              <FileDown className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            
            {/* Auto-save indicator */}
            <div className={`flex items-center text-xs ${
              autoSaveStatus === 'unsaved' ? 'text-orange-500' : 
              autoSaveStatus === 'saving' ? 'text-blue-500' : 'text-gray-500'
            }`}>
              {autoSaveStatus === 'saving' && (
                <div className="animate-spin rounded-full h-3 w-3 border border-current border-t-transparent mr-1"></div>
              )}
              {getAutoSaveText()}
            </div>
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
                        
                        if (editorRef.current) {
                          // Clear placeholder text if present
                          const placeholder = editorRef.current.querySelector('[style*="color: #9ca3af"]');
                          if (placeholder) {
                            editorRef.current.innerHTML = '';
                          }
                          
                          // Create and add tag heading
                          const heading = document.createElement('h3');
                          heading.style.fontSize = '18px';
                          heading.style.fontWeight = '600';
                          heading.style.marginBottom = '12px';
                          heading.style.marginTop = '24px';
                          heading.style.color = '#374151';
                          heading.textContent = tag.name;
                          editorRef.current.appendChild(heading);
                          
                          // Add each bubble's content as a paragraph
                          tag.bubbleIds.forEach(bubbleId => {
                            const bubble = bubbles.find(b => b.id === bubbleId);
                            if (bubble && bubble.message.text) {
                              const paragraph = document.createElement('p');
                              paragraph.style.marginBottom = '16px';
                              paragraph.style.lineHeight = '1.6';
                              paragraph.textContent = bubble.message.text;
                              editorRef.current.appendChild(paragraph);
                            }
                          });
                          
                          // Update state with new content
                          setArticleContent(editorRef.current.innerHTML);
                        }
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
                        {/* Keyword/Title only */}
                        {bubble.title && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            {bubble.title}
                          </span>
                        )}
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

              {/* Formatting Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-3 bg-gray-50 border border-gray-200 rounded-t-lg border-b-0">
                {/* Text Format */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => applyFormat('bold')}
                    title="Bold"
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => applyFormat('italic')}
                    title="Italic"
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => applyFormat('underline')}
                    title="Underline"
                  >
                    <Underline className="h-4 w-4" />
                  </Button>
                </div>

                {/* Headings */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2 h-8 text-xs"
                    onClick={() => insertHeading(1)}
                    title="Heading 1"
                  >
                    H1
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2 h-8 text-xs"
                    onClick={() => insertHeading(2)}
                    title="Heading 2"
                  >
                    H2
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="px-2 h-8 text-xs"
                    onClick={() => insertHeading(3)}
                    title="Heading 3"
                  >
                    H3
                  </Button>
                </div>

                {/* Lists */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => applyFormat('insertUnorderedList')}
                    title="Bullet List"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => applyFormat('insertOrderedList')}
                    title="Numbered List"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </div>

                {/* Insert Elements */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={insertDivider}
                    title="Insert Divider"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Undo/Redo */}
                <div className="flex items-center gap-1 pr-2 border-r border-gray-300">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => applyFormat('undo')}
                    title="Undo"
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-2 h-8 w-8"
                    onClick={() => applyFormat('redo')}
                    title="Redo"
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </div>

                {/* Word Count */}
                <div className="flex items-center text-xs text-gray-500 pl-2">
                  <Type className="h-3 w-3 mr-1" />
                  {wordCount} words
                </div>
              </div>

              {/* Article Content */}
              <div 
                ref={editorRef}
                className="min-h-[400px] p-6 border border-gray-200 rounded-b-lg bg-white shadow-sm border-t-0"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => {
                  const content = e.currentTarget.innerHTML;
                  setArticleContent(content);
                  updateWordCount(content);
                }}
                onBlur={(e) => setArticleContent(e.currentTarget.innerHTML)}
                style={{
                  lineHeight: '1.6',
                  fontSize: '16px',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  outline: 'none'
                }}
              />


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
