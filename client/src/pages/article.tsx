import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Save, Eye, FileDown } from "lucide-react";
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
  const editorRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: bubbles = [], isLoading } = useQuery<BubbleWithMessage[]>({
    queryKey: ["/api/conversations", id, "bubbles"],
    enabled: !!id,
  });

  const { data: conversation } = useQuery({
    queryKey: ["/api/conversations", id],
    enabled: !!id,
  });

  // Set article title to conversation name when conversation loads
  useEffect(() => {
    if (conversation?.name && !articleTitle) {
      setArticleTitle(conversation.name);
    }
  }, [conversation?.name, articleTitle]);

  // Save article mutation
  const saveArticleMutation = useMutation({
    mutationFn: async (data: InsertArticle) => {
      const response = await apiRequest("POST", "/api/articles", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      alert("Article saved successfully!");
    },
  });

  const availableBubbles = bubbles.filter(bubble => !usedBubbles.includes(bubble.id));

  const handleBubbleDrop = (bubbleId: number, bubbleText: string) => {
    setUsedBubbles(prev => [...prev, bubbleId]);
    
    const newParagraph = `\n\n${bubbleText}\n\n`;
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
                {availableBubbles.map((bubble) => (
                  <div
                    key={bubble.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 cursor-grab hover:shadow-md transition-all duration-200"
                    draggable
                    onDragEnd={(e) => {
                      const dropArea = document.elementFromPoint(e.clientX, e.clientY);
                      if (dropArea?.classList.contains('drop-zone')) {
                        handleBubbleDrop(bubble.id, bubble.message.text);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${getCategoryColor(bubble.category)}-100 text-${getCategoryColor(bubble.category)}-700`}>
                        {getCategoryLabel(bubble.category)}
                      </span>
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
              <div className="drop-zone border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6 text-center text-gray-500 hover:border-primary hover:text-primary transition-colors">
                <div className="text-2xl mb-2">+</div>
                <p>Drag bubbles here to build your article</p>
              </div>

              {/* Article Content */}
              <div 
                ref={editorRef}
                className="min-h-[400px] space-y-6"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => setArticleContent(e.currentTarget.textContent || "")}
              >
                {articleContent ? (
                  <div dangerouslySetInnerHTML={{ __html: articleContent.replace(/\n/g, '<br />') }} />
                ) : (
                  <div className="text-gray-500 italic">
                    Start writing your article or drag bubbles from the sidebar...
                  </div>
                )}
              </div>

              {/* Additional Drop Zone */}
              <div className="drop-zone border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-gray-400 hover:border-primary-400 transition-colors mt-8">
                <div className="text-lg mb-1">+</div>
                <p className="text-sm">Drop content here</p>
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
