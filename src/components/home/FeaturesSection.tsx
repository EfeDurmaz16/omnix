'use client';

import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Image, 
  Video, 
  Code, 
  Globe, 
  Shield,
  Zap,
  Users,
  BarChart3,
  Clock
} from 'lucide-react';

export function FeaturesSection() {
  const features = [
    {
      icon: MessageSquare,
      title: 'Text Generation',
      description: 'Access GPT-4, Claude, Gemini, and other leading language models for any text generation task.',
      benefits: ['Multiple providers', 'Best pricing', 'High availability']
    },
    {
      icon: Image,
      title: 'Image Generation', 
      description: 'Create stunning visuals with DALL-E, Midjourney, Stable Diffusion, and more image generation models.',
      benefits: ['Multiple styles', 'High resolution', 'Fast generation']
    },
    {
      icon: Video,
      title: 'Video Generation',
      description: 'Generate videos using cutting-edge models from RunwayML, Pika Labs, and other providers.',
      benefits: ['Multiple formats', 'Professional quality', 'Easy to use']
    },
    {
      icon: Code,
      title: 'Developer API',
      description: 'Integrate AI capabilities into your applications with our simple, unified API interface.',
      benefits: ['REST API', 'SDKs available', 'Comprehensive docs']
    },
    {
      icon: Globe,
      title: 'Global Infrastructure',
      description: 'Fast response times worldwide with our distributed infrastructure and edge locations.',
      benefits: ['Low latency', 'High availability', '99.9% uptime']
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Enterprise-grade security with SOC 2 compliance, data encryption, and privacy controls.',
      benefits: ['SOC 2 compliant', 'Data encryption', 'Privacy focused']
    }
  ];

  const stats = [
    { icon: Users, value: '10,000+', label: 'Active Developers' },
    { icon: BarChart3, value: '1M+', label: 'API Calls/Month' },
    { icon: Clock, value: '<100ms', label: 'Average Response' },
    { icon: Zap, value: '20+', label: 'AI Models' }
  ];

  return (
    <section className="relative py-20 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="glass-morphism-light border-slate-400/20 text-slate-200 px-4 py-2 mb-6 glow-slate">
            <Zap className="w-4 h-4 mr-2" />
            Platform Features
          </Badge>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
            Everything You Need
            <br />
            <span className="bg-gradient-to-r from-slate-400 to-slate-600 bg-clip-text ">
              In One Platform
            </span>
          </h2>
          
          <p className="text-lg text-slate-300 max-w-3xl mx-auto leading-relaxed">
            Access the best AI models from multiple providers through a single, 
            unified platform. No more managing multiple API keys or dealing with different interfaces.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-600/10 to-slate-700/10 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              
              <div className="relative glass-morphism rounded-2xl p-6 group-hover:glass-morphism-heavy transition-all duration-300 border border-slate-400/20">
                {/* Icon */}
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl blur-sm glow-slate group-hover:scale-110 transition-transform duration-300" />
                  <div className="relative w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl shadow-lg flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-white" strokeWidth={2} />
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-slate-300 text-sm leading-relaxed mb-4">
                  {feature.description}
                </p>

                {/* Benefits */}
                <div className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div key={benefitIndex} className="flex items-center text-xs text-slate-400">
                      <div className="w-1 h-1 bg-slate-500 rounded-full mr-2" />
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="glass-morphism-light rounded-2xl p-8 glow-slate">
          <h3 className="text-2xl font-semibold text-white text-center mb-8">
            Trusted by Developers Worldwide
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-600/20 to-slate-700/20 rounded-lg blur-sm" />
                  <div className="relative w-12 h-12 mx-auto bg-gradient-to-br from-slate-600/30 to-slate-700/30 rounded-lg flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-slate-300" strokeWidth={2} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
} 