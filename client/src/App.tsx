import { Switch, Route, useLocation } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavSidebar from "@/components/nav-sidebar";
import Landing from "@/pages/landing";
import Conversations from "@/pages/conversations";
import Chat from "@/pages/chat";
import Bubbles from "@/pages/bubbles";
import ArticlePage from "./pages/article";
import ColorSchemaPage from "./pages/color-schema";
import NotFoundPage from "./pages/not-found";
import type { ConversationWithStats } from "@shared/schema";

// Bubbles listing component - shows all conversations with bubbles
function BubblesListing() {
  const [, navigate] = useLocation();
  const { data: conversations = [] } = useQuery<ConversationWithStats[]>({
    queryKey: ["/api/conversations"],
  });

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Bubbles</h1>
        <p className="text-gray-600 mb-6">Select a conversation to view its thought bubbles</p>

        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/bubbles/${conversation.id}`)}
            >
              <h3 className="font-medium">{conversation.name}</h3>
              <p className="text-sm text-gray-500">
                {conversation.messageCount} messages
              </p>
            </div>
          ))}
        </div>

        {conversations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No conversations found.</p>
            <button
              onClick={() => navigate('/conversations')}
              className="mt-4 text-primary hover:underline"
            >
              Create your first conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Articles listing component - shows all conversations with articles
function ArticlesListing() {
  const [, navigate] = useLocation();
  const { data: conversations = [] } = useQuery<ConversationWithStats[]>({
    queryKey: ["/api/conversations"],
  });

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Articles</h1>
        <p className="text-gray-600 mb-6">Select a conversation to create or view articles from its thought bubbles</p>

        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => navigate(`/article/${conversation.id}`)}
            >
              <h3 className="font-medium">{conversation.name}</h3>
              <p className="text-sm text-gray-500">
                {conversation.messageCount} messages
              </p>
            </div>
          ))}
        </div>

        {conversations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No conversations found.</p>
            <button
              onClick={() => navigate('/conversations')}
              className="mt-4 text-primary hover:underline"
            >
              Create your first conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


function Router() {
  const [location] = useLocation();
  const showSidebar = location !== '/';

  return (
    <div className="flex h-screen">
      {showSidebar && <NavSidebar />}
      <div className={`flex-1 ${showSidebar ? 'md:ml-64' : ''}`}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/conversations" component={Conversations} />
          <Route path="/chat/:id?" component={Chat} />
          <Route path="/bubbles/:conversationId" component={Bubbles} />
          <Route path="/bubbles" component={BubblesListing} />
          <Route path="/article" element={<ArticlePage />} />
          <Route path="/colors" element={<ColorSchemaPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Switch>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;