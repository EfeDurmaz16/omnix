'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ChatInterface } from '@/components/dashboard/ChatInterface';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Zap, Lock, Star, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const [guestMessageCount, setGuestMessageCount] = useState(0);
  const maxGuestMessages = 5;

  useEffect(() => {
    // Load guest message count from localStorage
    if (!user && isLoaded) {
      const saved = localStorage.getItem('omnix-guest-messages');
      setGuestMessageCount(saved ? parseInt(saved) : 0);
    }
  }, [user, isLoaded]);

  const incrementGuestMessages = () => {
    if (!user) {
      const newCount = guestMessageCount + 1;
      setGuestMessageCount(newCount);
      localStorage.setItem('omnix-guest-messages', newCount.toString());
    }
  };

  const canUseChat = !!user || guestMessageCount < maxGuestMessages;
  const remainingMessages = maxGuestMessages - guestMessageCount;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-animated-gradient flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full blur-xl glow-purple"></div>
            <div className="relative h-16 w-16 mx-auto">
              <div className="absolute inset-0 border-4 border-purple-400/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-purple-400 rounded-full animate-spin"></div>
            </div>
          </div>
          <p className="text-slate-300 font-light">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-animated-gradient floating-particles">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-lg glow-purple"></div>
            <Badge className="relative glass-morphism-light border-purple-400/30 text-purple-200 font-light px-6 py-3 glow-purple">
              <MessageSquare className="mr-2 h-4 w-4" />
              {user ? 'Welcome back!' : `${remainingMessages} free messages remaining`}
            </Badge>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-light mb-4 text-white">
            Chat with <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Omnix AI</span>
          </h1>
          
          <p className="text-xl text-slate-300 font-light max-w-2xl mx-auto">
            Access multiple AI models through one unified interface. 
            {!user && ` Try ${maxGuestMessages} messages for free, then sign up for unlimited access.`}
          </p>
        </div>

        {/* Guest Limitation Warning */}
        {!user && guestMessageCount >= maxGuestMessages && (
          <Card className="mb-8 glass-morphism-light border-amber-400/30">
            <CardContent className="p-6 text-center">
              <Lock className="mx-auto h-12 w-12 text-amber-400 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Free Messages Used</h3>
              <p className="text-slate-300 mb-6">
                You've used all {maxGuestMessages} free messages. Sign up to continue chatting with unlimited access to all AI models.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/signup">
                  <Button className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                    <Star className="mr-2 h-4 w-4" />
                    Sign Up Free
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" className="border-slate-500 text-slate-300 hover:bg-slate-800">
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="glass-morphism-heavy rounded-3xl p-6 glow-purple">
            <div className="h-[600px]">
              <ChatInterface 
                isGuest={!user}
                canUseChat={canUseChat}
                onMessageSent={incrementGuestMessages}
                guestMessageCount={guestMessageCount}
                maxGuestMessages={maxGuestMessages}
              />
            </div>
          </div>
        </div>

        {/* Feature Benefits for Guests */}
        {!user && (
          <div className="mt-12 text-center">
            <h2 className="text-2xl font-light text-white mb-8">
              Sign up to unlock everything
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="glass-morphism rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Unlimited Chat</h3>
                <p className="text-slate-400 text-sm">
                  No message limits. Chat as much as you want with all AI models.
                </p>
              </div>
              
              <div className="glass-morphism rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Image & Video</h3>
                <p className="text-slate-400 text-sm">
                  Generate images with DALL-E, Imagen, and videos with Veo, Seedance.
                </p>
              </div>
              
              <div className="glass-morphism rounded-2xl p-6">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Star className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Premium Models</h3>
                <p className="text-slate-400 text-sm">
                  Access to GPT-4, Claude 3.5, Gemini 2.5, and other premium models.
                </p>
              </div>
            </div>
            
            <div className="mt-8">
              <Link href="/signup">
                <Button size="lg" className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600">
                  <Star className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
