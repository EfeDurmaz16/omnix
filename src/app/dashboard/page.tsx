'use client';

import { useState } from 'react';
import { ModernChatInterface } from '@/components/chat/ModernChatInterface';
import { ImageGenerator } from '@/components/dashboard/ImageGenerator';
import { VideoGenerator } from '@/components/dashboard/VideoGenerator';
import { AgentBuilder } from '@/components/agents/AgentBuilder';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Navbar } from '@/components/layout/Navbar';
import { MessageSquare, Image, Video, Bot } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('chat');

  return (
    <div className="h-screen cultural-bg">
      <Navbar />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-64px)]">
        <div className="border-b cultural-border cultural-card">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-2">
              <TabsList className="grid w-full max-w-lg grid-cols-4 cultural-card">
                <TabsTrigger value="chat" className="flex items-center space-x-2 cultural-hover transition-all duration-300">
                  <MessageSquare className="h-4 w-4" />
                  <span>Chat</span>
                </TabsTrigger>
                <TabsTrigger value="agents" className="flex items-center space-x-2 cultural-hover transition-all duration-300">
                  <Bot className="h-4 w-4" />
                  <span>Agents</span>
                </TabsTrigger>
                <TabsTrigger value="image" className="flex items-center space-x-2 cultural-hover transition-all duration-300">
                  <Image className="h-4 w-4" />
                  <span>Images</span>
                </TabsTrigger>
                <TabsTrigger value="video" className="flex items-center space-x-2 cultural-hover transition-all duration-300">
                  <Video className="h-4 w-4" />
                  <span>Videos</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Theme Toggle */}
              <div className="flex items-center">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>

        <TabsContent value="chat" className="h-[calc(100vh-9rem)] mt-0 cultural-bg">
          <ModernChatInterface onModelRedirect={setActiveTab} />
        </TabsContent>

        <TabsContent value="agents" className="h-[calc(100vh-9rem)] mt-0 overflow-auto">
          <div className="container mx-auto px-4 py-6 cultural-text-primary">
            <AgentBuilder />
          </div>
        </TabsContent>

        <TabsContent value="image" className="h-[calc(100vh-9rem)] mt-0 overflow-auto">
          <div className="container mx-auto px-4 py-6 cultural-text-primary">
            <ImageGenerator />
          </div>
        </TabsContent>

        <TabsContent value="video" className="h-[calc(100vh-9rem)] mt-0 overflow-auto">
          <div className="container mx-auto px-4 py-6 cultural-text-primary">
            <VideoGenerator />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 