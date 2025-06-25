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
  Cpu
} from 'lucide-react';

export function HeroSection() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-500/50 via-slate-800/30 to-slate-700/50" />
      
      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-slate-600/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '-5s' }} />
      
      <div className="container mx-auto px-4 sm:px-6 text-center relative z-10">
        {/* Status Badge */}
        <div className="mb-8">
          <Badge className="glass-morphism-light border-slate-400/20 text-slate-200 px-4 py-2 text-sm font-medium glow-slate">
            <Zap className="w-4 h-4 mr-2" />
            Multiple AI Models • One Platform
          </Badge>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
          Access All AI Models
          <br />
          <span className="bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text text-transparent">
            In One Place
          </span>
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-3xl mx-auto leading-relaxed">
          Generate text, images, and videos using the latest models from OpenAI, Anthropic, 
          Google, and more. One subscription, unlimited possibilities.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          <Button 
            asChild 
            size="lg"
            className="glass-button bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white px-8 py-4 text-lg font-medium glow-slate border-0"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <Link href="/signup" className="flex items-center">
              Start Building
              <ArrowRight className={`ml-2 h-5 w-5 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            size="lg"
            className="glass-morphism-light border-slate-400/30 text-white hover:bg-slate-400/10 px-8 py-4 text-lg font-medium"
          >
            <Link href="/pricing">View Pricing</Link>
          </Button>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {/* Text Generation */}
          <div className="glass-morphism rounded-2xl p-6 group hover:glass-morphism-heavy transition-all duration-300">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl mb-4 mx-auto glow-slate group-hover:scale-110 transition-transform duration-300">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Text Generation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Access GPT-4, Claude, Gemini, and other leading language models for any text task.
            </p>
          </div>

          {/* Image Generation */}
          <div className="glass-morphism rounded-2xl p-6 group hover:glass-morphism-heavy transition-all duration-300">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl mb-4 mx-auto glow-slate group-hover:scale-110 transition-transform duration-300">
              <Image className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Image Generation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Create stunning visuals with DALL-E, Midjourney, Stable Diffusion, and more.
            </p>
          </div>

          {/* Video Generation */}
          <div className="glass-morphism rounded-2xl p-6 group hover:glass-morphism-heavy transition-all duration-300">
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl mb-4 mx-auto glow-slate group-hover:scale-110 transition-transform duration-300">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Video Generation</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Generate videos using the latest models from RunwayML, Pika Labs, and others.
            </p>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex flex-wrap justify-center items-center gap-8 text-slate-400 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>10,000+ Developers</span>
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            <span>20+ AI Models</span>
          </div>
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            <span>99.9% Uptime</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4" />
            <span>Enterprise Ready</span>
          </div>
        </div>
      </div>
    </section>
  );
} 