'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowRight, 
  Zap, 
  Users, 
  Globe, 
  Star,
  MessageSquare,
  Image,
  Video,
  Cpu,
  TrendingUp,
  DollarSign,
  Shield,
  Clock
} from 'lucide-react';

export function HeroSection() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-slate-800/30" />
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-5s' }} />
      
      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        {/* Status Badge */}
        <div className="mb-8">
          <Badge className="glass-morphism-light border-purple-400/30 text-purple-200 px-6 py-3 text-sm font-medium glow-purple">
            <TrendingUp className="w-4 h-4 mr-2" />
            Powering 10,000+ Developers • $2M+ API Costs Saved Monthly
          </Badge>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          The AWS for AI
          <br />
          <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text ">
            One Platform, Every Model
          </span>
        </h1>

        {/* Value Proposition */}
        <p className="text-xl sm:text-2xl text-slate-300 mb-6 max-w-4xl mx-auto leading-relaxed font-light">
          OmniX unifies 100+ AI models from OpenAI, Anthropic, Google, and Meta under one API.
          <br />
          <span className="text-purple-300 font-medium">Reduce AI costs by 60% while accelerating development 10x.</span>
        </p>

        {/* Key Metrics */}
        <div className="flex flex-wrap justify-center items-center gap-8 mb-10 text-slate-300">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span className="font-semibold">60% Cost Reduction</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">10x Faster Integration</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span className="font-semibold">10,000+ Developers</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold">100+ AI Models</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button 
            asChild 
            size="lg"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-10 py-4 text-lg font-semibold glow-purple border-0 shadow-2xl"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Link href="/signup" className="flex items-center">
              Start Building Free
              <ArrowRight className={`ml-2 h-5 w-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="glass-morphism-light border-purple-400/30 text-white hover:bg-purple-400/10 px-10 py-4 text-lg font-semibold"
          >
            <Link href="#demo">See Live Demo</Link>
          </Button>
        </div>

        {/* Problem → Solution Value Prop */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Problem */}
            <div className="glass-morphism rounded-2xl p-6 border border-red-400/20">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl mb-4 mx-auto flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-red-300 mb-2">The Problem</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Developers manage 10+ different AI APIs, each with unique pricing, rate limits, and formats. 
                Integration takes months, costs are unpredictable.
              </p>
            </div>

            {/* Solution */}
            <div className="glass-morphism rounded-2xl p-6 border border-purple-400/30 glow-purple">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl mb-4 mx-auto flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-purple-300 mb-2">Our Solution</h3>
              <p className="text-slate-300 text-sm leading-relaxed font-medium">
                One unified API for 100+ models. Intelligent routing, cost optimization, 
                automatic failover. Deploy in minutes, not months.
              </p>
            </div>

            {/* Market */}
            <div className="glass-morphism rounded-2xl p-6 border border-green-400/20">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-4 mx-auto flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-green-300 mb-2">Market Size</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                $150B AI infrastructure market growing 40% YoY. Every company needs AI, 
                but current solutions are fragmented and expensive.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {/* Unified Text Generation */}
          <div className="glass-morphism rounded-2xl p-6 group hover:glass-morphism-heavy transition-all duration-300 border border-purple-400/20">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl mb-4 mx-auto glow-purple group-hover:scale-110 transition-transform duration-300">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Unified Text API</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              GPT-4, Claude, Gemini, LLaMA - all through one API. Automatic cost optimization and intelligent routing.
            </p>
            <div className="mt-3 text-xs text-purple-300 font-medium">60% Cost Reduction vs Direct APIs</div>
          </div>

          {/* Enterprise Image Generation */}
          <div className="glass-morphism rounded-2xl p-6 group hover:glass-morphism-heavy transition-all duration-300 border border-blue-400/20">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl mb-4 mx-auto glow-blue group-hover:scale-110 transition-transform duration-300">
              <Image className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Enterprise Imaging</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              DALL-E, Midjourney, Stable Diffusion with enterprise compliance, audit logs, and bulk processing.
            </p>
            <div className="mt-3 text-xs text-blue-300 font-medium">SOC 2 Compliant • 99.9% Uptime</div>
          </div>

          {/* Advanced Video Generation */}
          <div className="glass-morphism rounded-2xl p-6 group hover:glass-morphism-heavy transition-all duration-300 border border-cyan-400/20">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-cyan-600 to-teal-600 rounded-xl mb-4 mx-auto glow-cyan group-hover:scale-110 transition-transform duration-300">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Next-Gen Video AI</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sora, RunwayML, Pika Labs integration. First platform to offer unified video generation at scale.
            </p>
            <div className="mt-3 text-xs text-cyan-300 font-medium">Industry First • Patent Pending</div>
          </div>
        </div>

        {/* Trust Indicators & Social Proof */}
        <div className="glass-morphism-light rounded-2xl p-8 glow-purple mb-8">
          <h3 className="text-xl font-semibold text-white mb-6">Trusted by Industry Leaders</h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-1">10,000+</div>
              <div className="text-sm text-slate-400">Active Developers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-400 mb-1">$2M+</div>
              <div className="text-sm text-slate-400">Saved Monthly</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400 mb-1">100+</div>
              <div className="text-sm text-slate-400">AI Models</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400 mb-1">99.9%</div>
              <div className="text-sm text-slate-400">Uptime SLA</div>
            </div>
          </div>

          <div className="text-center text-slate-400 text-sm">
            "OmniX reduced our AI infrastructure costs by 60% while improving reliability. 
            <br />
            It's the missing piece every AI company needs."
            <div className="mt-2 text-purple-300 font-medium">— CTO, Fortune 500 Company</div>
          </div>
        </div>
      </div>
    </section>
  );
} 