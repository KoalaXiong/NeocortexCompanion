import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Conversations from "@/pages/conversations";
import Chat from "@/pages/chat";
import Bubbles from "@/pages/bubbles";
import Article from "@/pages/article";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/conversations" component={Conversations} />
      <Route path="/chat/:id?" component={Chat} />
      <Route path="/bubbles/:conversationId" component={Bubbles} />
      <Route path="/article/:conversationId?" component={Article} />
      <Route component={NotFound} />
    </Switch>
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
