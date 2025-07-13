import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare, Workflow, FileText, Plus, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen gradient-primary flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center text-white">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          Neocortical<br />
          <span className="text-purple-200">Extension Layer</span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-purple-100 max-w-2xl mx-auto leading-relaxed">
          Your personal thinking companion. Transform conversations into organized thoughts,
          then craft them into beautiful articles.
        </p>
        <div className="space-y-4 md:space-y-0 md:space-x-6 md:flex md:justify-center">
          <Link href="/chat">
            <Button size="lg" className="w-full md:w-auto bg-white text-primary hover:bg-gray-100 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
              <Plus className="mr-2 h-5 w-5" />
              Start New Conversation
            </Button>
          </Link>
          <Link href="/conversations">
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full md:w-auto bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary transition-all duration-200"
            >
              <Users className="mr-2 h-5 w-5" />
              My Conversations
            </Button>
          </Link>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-5xl mx-auto">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 text-left">
              <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Structured Conversations</h3>
              <p className="text-purple-100">Chat with yourself in a WeChat-like interface to explore ideas and thoughts.</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 text-left">
              <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <Workflow className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Thought Bubbles</h3>
              <p className="text-purple-100">Transform messages into draggable bubbles and organize them spatially.</p>
            </CardContent>
          </Card>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6 text-left">
              <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Article Creation</h3>
              <p className="text-purple-100">Convert organized thoughts into structured articles and export as PDFs.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
