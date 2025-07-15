import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavSidebar from "@/components/nav-sidebar";
import Landing from "@/pages/landing";
import Conversations from "@/pages/conversations";
import Chat from "@/pages/chat";
import Bubbles from "@/pages/bubbles";
import Article from "@/pages/article";
import NotFound from "@/pages/not-found";

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
          <Route path="/article/:conversationId?" component={Article} />
          <Route component={NotFound} />
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
