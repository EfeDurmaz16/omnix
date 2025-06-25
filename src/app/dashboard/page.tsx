'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageGenerator } from '@/components/dashboard/ImageGenerator';
import { VideoGenerator } from '@/components/dashboard/VideoGenerator';
import { AuthWrapper, useAuth } from '@/components/auth/ClerkAuthWrapper';
import { Image, Video, Zap, TrendingUp, Users, Brain, Cpu, Sparkles, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function DashboardContent() {
  const { user, usageStats } = useAuth();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center relative floating-particles">
        <div className="text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full blur-xl glow-purple"></div>
            <div className="relative h-16 w-16 mx-auto">
              <div className="absolute inset-0 border-4 border-purple-400/30 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-purple-400 rounded-full animate-spin"></div>
            </div>
          </div>
          <p className="text-slate-300 font-light">Initializing neural interface...</p>
        </div>
      </div>
    );
  }

  const formatCredits = (credits: number) => {
    return credits?.toLocaleString() || '0';
  };

  const usagePercentage = usageStats 
    ? ((usageStats.totalTokens / (usageStats.totalTokens + usageStats.remainingCredits)) * 100)
    : 0;

  const statCards = [
    {
      title: "Neural Credits",
      value: formatCredits(usageStats?.remainingCredits || 0),
      description: "Available for AI processing",
      icon: Zap,
      gradient: "from-yellow-400 to-orange-500",
      glow: "glow-orange"
    },
    {
      title: "Total Neural Usage",
      value: formatCredits(usageStats?.totalTokens || 0),
      description: `${usagePercentage.toFixed(1)}% of cycle allowance`,
      icon: TrendingUp,
      gradient: "from-purple-400 to-blue-500",
      glow: "glow-purple"
    },
    {
      title: "Visual Synthesis",
      value: usageStats?.imageGenerations || 0,
      description: "Images created this cycle",
      icon: Image,
      gradient: "from-blue-400 to-cyan-500",
      glow: "glow-blue"
    },
    {
      title: "Access Level",
      value: user.plan?.charAt(0).toUpperCase() + (user.plan?.slice(1) || ''),
      description: "Current neural tier",
      icon: Users,
      gradient: "from-pink-400 to-purple-500",
      glow: "glow-pink"
    }
  ];

  return (
    <div className="min-h-screen relative bg-animated-gradient floating-particles">
      <Navbar />
      
      <div className="container py-12 pt-32 relative">
        {/* Navigation */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="text-slate-300 hover:text-white">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Chat
            </Button>
          </Link>
        </div>

        {/* Enhanced Welcome Header */}
        <div className="mb-12 text-center">
          <div className="relative mb-6 inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-full blur-lg glow-purple"></div>
            <Badge className="relative glass-morphism-light border-purple-400/30 text-purple-200 font-light px-6 py-3 glow-purple">
              <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
              Creative Studio Active
            </Badge>
          </div>
          <h1 className="text-4xl font-light mb-4 text-white sm:text-5xl">
            Welcome to the <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">Creative Studio</span>
          </h1>
          <p className="text-xl text-slate-300 font-light max-w-2xl mx-auto">
            Generate stunning images and videos with advanced AI models. Your creative vision, powered by cutting-edge technology.
          </p>
        </div>

        {/* Enhanced Usage Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={stat.title} className="relative group">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500`}></div>
                
                <div className={`relative glass-morphism-heavy rounded-3xl p-6 ${stat.glow} hover:shadow-2xl transition-all duration-500 group-hover:scale-105`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-slate-300">{stat.title}</h3>
                    <div className="relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} rounded-xl blur-sm ${stat.glow}`}></div>
                      <div className={`relative w-10 h-10 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                  <div className="text-3xl font-light text-white mb-2">{stat.value}</div>
                  <p className="text-xs text-slate-400 font-light">
                    {stat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Creative Tools Tabs */}
        <div className="relative">
          <div className="glass-morphism-heavy rounded-3xl p-8 glow-purple">
            <Tabs defaultValue="image" className="space-y-8">
              <div className="flex justify-center">
                <TabsList className="glass-morphism-light border-white/20 rounded-2xl p-2">
                  <TabsTrigger value="image" className="flex items-center space-x-3 px-6 py-3 rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 transition-all duration-300">
                    <Image className="h-5 w-5" />
                    <span className="font-light">Visual AI</span>
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center space-x-3 px-6 py-3 rounded-xl data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-300 transition-all duration-300">
                    <Video className="h-5 w-5" />
                    <span className="font-light">Motion AI</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="image" className="space-y-6">
                <div className="glass-morphism-light rounded-2xl p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl blur-sm glow-blue"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                        <Image className="w-6 h-6 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-light text-white">Visual Synthesis Engine</h3>
                      <p className="text-slate-300 font-light text-sm">
                        Generate stunning visuals with DALL·E 3, Midjourney, Imagen, and advanced neural image models. 
                        Perfect for creative projects and professional visual content.
                      </p>
                    </div>
                  </div>
                </div>
                <ImageGenerator />
              </TabsContent>

              <TabsContent value="video" className="space-y-6">
                <div className="glass-morphism-light rounded-2xl p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl blur-sm glow-pink"></div>
                      <div className="relative w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Video className="w-6 h-6 text-white" strokeWidth={1.5} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-xl font-light text-white">Motion Generation Matrix</h3>
                        <Badge className="glass-morphism-light border-pink-400/30 text-pink-200 font-light px-3 py-1 text-xs">
                          Neural Beta
                        </Badge>
                      </div>
                      <p className="text-slate-300 font-light text-sm">
                        Create dynamic video content from text using Veo, Seedance, and cutting-edge motion AI models - all 100% available. 
                        Transform concepts into cinematic reality with neural precision.
                      </p>
                    </div>
                  </div>
                </div>
                <VideoGenerator />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  );
} 