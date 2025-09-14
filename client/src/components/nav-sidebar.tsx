import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Home, MessageSquare, Zap, FileText, Settings, Menu, X } from "lucide-react";

export default function NavSidebar() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Conversations', href: '/conversations', icon: MessageSquare },
    { name: 'Bubbles', href: '/bubbles', icon: Zap },
    { name: 'Articles', href: '/article', icon: FileText },
  ];

  const isActive = (href: string) => {
    if (href === '/') return location === '/';
    return location.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-white/90 backdrop-blur-sm"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 gradient-primary-to-secondary text-white">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg">Neocortex</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(item.href) 
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-primary' 
                    : 'text-gray-700 hover:text-primary hover:bg-gray-50'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="mr-3 h-4 w-4" />
                {item.name}
              </Link>
            ))}
          </nav>

          <Separator />

          {/* Footer */}
          <div className="p-4">
            <Card className="p-3 gradient-purple-blue text-white">
              <div className="text-sm">
                <p className="font-medium">Thinking Companion</p>
                <p className="text-xs text-purple-200 mt-1">
                  Organize your thoughts into bubbles and articles
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}