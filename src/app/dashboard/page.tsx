'use client';

import { useState } from 'react';
import { ModernChatInterface } from '@/components/chat/ModernChatInterface';
import { ImageGenerator } from '@/components/dashboard/ImageGenerator';
import { VideoGenerator } from '@/components/dashboard/VideoGenerator';
import { AgentDashboard } from '@/components/dashboard/AgentDashboard';
import { CodeSandbox } from '@/components/dashboard/CodeSandbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Navbar } from '@/components/layout/Navbar';
import { MessageSquare, Image, Video, Bot, Code } from 'lucide-react';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('sandbox');

  return (
    <div className="h-screen cultural-bg">
      <Navbar />
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-64px)] flex flex-col">
        <div className="border-b cultural-border cultural-card shrink-0">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-2">
              <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground cultural-card">
                <TabsTrigger value="chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span>Chat</span>
                </TabsTrigger>
                <TabsTrigger value="agents">
                  <Bot className="h-4 w-4 mr-2" />
                  <span>Agents</span>
                </TabsTrigger>
                <TabsTrigger value="sandbox" style={{backgroundColor: 'red', color: 'white'}}>
                  <Code className="h-4 w-4 mr-2" />
                  <span>Sandbox</span>
                </TabsTrigger>
                <TabsTrigger value="image">
                  <Image className="h-4 w-4 mr-2" />
                  <span>Images</span>
                </TabsTrigger>
                <TabsTrigger value="video">
                  <Video className="h-4 w-4 mr-2" />
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

        <TabsContent value="chat" className="flex-1 min-h-0 mt-0 cultural-bg">
          <ModernChatInterface onModelRedirect={setActiveTab} />
        </TabsContent>

        <TabsContent value="agents" className="flex-1 min-h-0 mt-0 overflow-auto">
          <div className="container mx-auto px-4 py-6 cultural-text-primary">
            <AgentDashboard />
          </div>
        </TabsContent>

        <TabsContent value="sandbox" className="flex-1 min-h-0 mt-0 overflow-auto">
          <div className="container mx-auto px-4 py-6 cultural-text-primary">
            <div className="text-center">
              <h1 className="text-2xl font-bold mb-4">🎉 Sandbox Tab is Working!</h1>
              <p>This is the sandbox content. If you can see this, the tab is working correctly.</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="image" className="flex-1 min-h-0 mt-0 overflow-auto">
          <div className="container mx-auto px-4 py-6 cultural-text-primary">
            <ImageGenerator />
          </div>
        </TabsContent>

        <TabsContent value="video" className="flex-1 min-h-0 mt-0 overflow-auto">
          <div className="container mx-auto px-4 py-6 cultural-text-primary">
            <VideoGenerator />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 