'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowRight, 
  Play, 
  Code, 
  MessageSquare, 
  Image, 
  Video, 
  FileText,
  Mic,
  Upload,
  Download,
  Zap,
  Check,
  Star,
  Sparkles,
  Brain,
  Settings,
  Users,
  Infinity
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen cultural-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 cultural-border border-t-primary rounded-full animate-spin"></div>
          <p className="cultural-text-primary font-mono">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cultural-bg cultural-text-primary font-mono">
      {/* Header */}
      <header className="fixed top-0 w-full cultural-card backdrop-blur-sm border-b cultural-border z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <img src="/aspendos-icon.svg" alt="Aspendos" className="w-8 h-8" />
                <span className="text-xl font-bold cultural-text-primary">Aspendos</span>
              </Link>
              <nav className="hidden md:flex space-x-6 text-sm">
                <Link href="#product" className="cultural-text-muted hover:text-primary transition-colors">Product</Link>
                <Link href="/billing" className="cultural-text-muted hover:text-primary transition-colors">Billing</Link>
                <Link href="/themes" className="cultural-text-muted hover:text-primary transition-colors">Themes</Link>
                <Link href="#docs" className="cultural-text-muted hover:text-primary transition-colors">Docs</Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {user ? (
                <Link href="/dashboard">
                  <Button className="cultural-primary cultural-hover">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="cultural-text-muted hover:text-primary">
                      Login
                    </Button>
                  </Link>
                  <Link href="/signup">
                    <Button className="cultural-primary cultural-hover">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden cultural-gradient-bg">
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/95 to-background/90 animate-shimmer" />
        
        <div className="relative z-10 container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto"
          >
            <Badge className="mb-6 cultural-accent cultural-hover inline-flex items-center px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              The Future of AI Development
            </Badge>
            
            <h1 className="text-6xl md:text-7xl font-mono font-bold mb-8 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text olive-breeze">
              aspendos.ai
            </h1>
            
            <p className="text-xl md:text-2xl cultural-text-primary mb-8 max-w-3xl mx-auto">
              Where ancient wisdom meets cutting-edge AI. Switch between 150+ models, retain infinite context, 
              and build with voice-native multimodal capabilities.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href={user ? "/dashboard" : "/signup"}>
                <Button size="lg" className="cultural-primary cultural-hover px-8 py-4 text-lg transition-all duration-300">
                  {user ? "Launch Dashboard" : "Start Building"}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="cultural-card cultural-border px-8 py-4 text-lg cultural-hover transition-all duration-300">
                <Play className="mr-2 w-5 h-5" />
                View Demo
              </Button>
            </div>
            
            {/* Animated Feature Preview */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="cultural-card rounded-2xl p-8 max-w-4xl mx-auto"
            >
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center cultural-accent p-4 rounded-lg cultural-hover transition-all duration-300">
                  <Brain className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-2 cultural-text-primary">150+ AI Models</h3>
                  <p className="text-sm cultural-text-muted/50">GPT-4, Claude, Gemini, Veo & more</p>
                </div>
                <div className="text-center cultural-accent p-4 rounded-lg cultural-hover transition-all duration-300">
                  <Infinity className="w-8 h-8 mx-auto mb-3 text-accent" />
                  <h3 className="font-semibold mb-2 cultural-text-primary">Infinite Context</h3>
                  <p className="text-sm cultural-text-muted/50">Never lose conversation history</p>
                </div>
                <div className="text-center cultural-accent p-4 rounded-lg cultural-hover transition-all duration-300">
                  <Mic className="w-8 h-8 mx-auto mb-3 text-primary" />
                  <h3 className="font-semibold mb-2 cultural-text-primary">Voice Native</h3>
                  <p className="text-sm cultural-text-muted/50">Speech-to-speech AI interactions</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature Section 1: Model Switching */}
      <section className="py-16 px-6 cultural-bg">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Visual Left */}
            <div className="space-y-4">
              <div className="cultural-card rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm cultural-text-muted">Available Models</span>
                  <Badge className="cultural-accent">
                    12 Active
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "GPT-4 Turbo", status: "active", icon: Brain },
                    { name: "Claude 3.5", status: "available", icon: MessageSquare },
                    { name: "Gemini 1.5", status: "available", icon: Sparkles },
                    { name: "DALL-E 3", status: "available", icon: Image },
                    { name: "Veo 2.0", status: "pro", icon: Video },
                    { name: "Mistral Large", status: "available", icon: Code }
                  ].map((model, index) => (
                    <div key={index} className={`p-3 rounded cultural-border ${
                      model.status === 'active' ? 'cultural-primary' : 
                      model.status === 'pro' ? 'cultural-secondary' :
                      'cultural-card'
                    } cultural-hover transition-all duration-300`}>
                      <div className="flex items-center space-x-2">
                        <model.icon className="w-4 h-4" />
                        <span className="text-sm cultural-text-primary">{model.name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Text Right */}
            <div className="space-y-6">
              <div className="space-y-4">
                <Badge className="cultural-accent">Model Switching</Badge>
                <h2 className="text-4xl font-bold cultural-text-primary">
                  Switch Between 150+ AI Models Instantly
                </h2>
                <p className="text-lg cultural-text-muted">
                  Access GPT-4, Claude, Gemini, DALL-E, Veo, and dozens more AI models 
                  with a single click. No API management, no complex integrations.
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-accent mt-1" />
                  <div>
                    <h4 className="font-semibold cultural-text-primary">Unified Interface</h4>
                    <p className="cultural-text-muted">One interface for all AI models</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-accent mt-1" />
                  <div>
                    <h4 className="font-semibold cultural-text-primary">Instant Switching</h4>
                    <p className="cultural-text-muted">Change models mid-conversation</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Check className="w-5 h-5 text-accent mt-1" />
                  <div>
                    <h4 className="font-semibold cultural-text-primary">Cost Optimization</h4>
                    <p className="cultural-text-muted">Automatically use the most cost-effective model</p>
                  </div>
                </div>
              </div>
              
              <Button className="cultural-primary cultural-hover">
                Explore Models
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 2: Chat Memory + Import/Export */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Left */}
            <div className="space-y-6">
              <h2 className="text-4xl font-bold cultural-text-primary">
                Your Conversations,
                <br />
                <span className="text-accent">Your Control</span>
              </h2>
              <p className="text-lg cultural-text-muted leading-relaxed">
                All chats are saved securely. Import previous chats, export as markdown or JSON, and keep your AI dialogue consistent across devices.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Automatic conversation saving</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Export to Markdown, JSON, PDF</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Cross-device synchronization</span>
                </div>
              </div>
            </div>

            {/* Visual Right */}
            <div className="space-y-4">
              <div className="cultural-card rounded-lg cultural-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm cultural-text-muted">Chat History</span>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="cultural-border cultural-text-primary">
                      <Upload className="w-4 h-4 mr-1" />
                      Import
                    </Button>
                    <Button size="sm" variant="outline" className="cultural-border cultural-text-primary">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { title: "Logo Design Session", time: "2 hours ago", messages: 24 },
                    { title: "Code Review with Claude", time: "Yesterday", messages: 15 },
                    { title: "Video Script Planning", time: "3 days ago", messages: 31 }
                  ].map((chat, index) => (
                    <div key={index} className="cultural-card rounded p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-sm font-medium cultural-text-primary">{chat.title}</h4>
                          <p className="text-xs cultural-text-muted">{chat.time} • {chat.messages} messages</p>
                        </div>
                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                          Saved
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 3: Multimodal Inputs */}
      <section className="py-16 px-6 cultural-bg">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Visual Left */}
            <div className="space-y-4">
              <div className="cultural-card rounded-lg cultural-border p-6">
                <div className="mb-4">
                  <span className="text-sm cultural-text-muted">Input Methods</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="cultural-card rounded-lg p-4 text-center">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                    <span className="text-sm cultural-text-primary">PDF Upload</span>
                  </div>
                  <div className="cultural-card rounded-lg p-4 text-center">
                    <Image className="w-8 h-8 mx-auto mb-2 text-green-400" />
                    <span className="text-sm cultural-text-primary">Image Analysis</span>
                  </div>
                  <div className="cultural-card rounded-lg p-4 text-center">
                    <Mic className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                    <span className="text-sm cultural-text-primary">Voice Input</span>
                  </div>
                  <div className="cultural-card rounded-lg p-4 text-center">
                    <Code className="w-8 h-8 mx-auto mb-2 text-orange-400" />
                    <span className="text-sm cultural-text-primary">Code Snippets</span>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-600/20 rounded border border-blue-600/30">
                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-blue-400 animate-pulse" />
                    <span className="text-sm text-blue-400">Listening... "Analyze this document for key insights"</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Text Right */}
            <div className="space-y-6">
              <h2 className="text-4xl font-bold cultural-text-primary">
                Talk, Type,
                <br />
                <span className="text-accent">Upload</span>
              </h2>
              <p className="text-lg cultural-text-muted leading-relaxed">
                Upload files, images, code snippets, or just speak. Get context-aware responses using the best model for the task.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Voice commands in 20+ languages</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>PDF, DOC, image, and code upload</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-400" />
                  <span>Automatic model selection by content</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 4: Live Demos */}
      <section className="py-16 px-6">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Text Left */}
            <div className="space-y-6">
              <h2 className="text-4xl font-bold cultural-text-primary">
                See It
                <br />
                <span className="text-accent">In Action</span>
              </h2>
              <p className="text-lg cultural-text-muted leading-relaxed">
                Watch how quickly you can generate a blog post, design a logo, or summarize a research paper using multiple AIs in one place.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Play className="w-5 h-5 text-green-400" />
                  <span>Real-time model switching</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Play className="w-5 h-5 text-green-400" />
                  <span>Multi-step AI workflows</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Play className="w-5 h-5 text-green-400" />
                  <span>Professional results in seconds</span>
                </div>
              </div>
            </div>

            {/* Visual Right - Demo Carousel */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { title: "Blog Writing", subtitle: "GPT-4 + Claude", icon: FileText, color: "blue" },
                  { title: "Logo Design", subtitle: "DALL-E 3", icon: Image, color: "green" },
                  { title: "Video Creation", subtitle: "Veo 2.0", icon: Video, color: "purple" },
                  { title: "Code Review", subtitle: "Claude + GPT-4", icon: Code, color: "orange" }
                ].map((demo, index) => (
                  <Card key={index} className="cultural-card cultural-border hover:opacity-80 transition-colors cursor-pointer">
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 mx-auto mb-3 rounded-lg bg-${demo.color}-600/20 flex items-center justify-center`}>
                        <demo.icon className={`w-6 h-6 text-${demo.color}-400`} />
                      </div>
                      <h4 className="font-medium mb-1 cultural-text-primary">{demo.title}</h4>
                      <p className="text-xs cultural-text-muted">{demo.subtitle}</p>
                      <Button size="sm" variant="ghost" className="mt-2 w-full">
                        <Play className="w-3 h-3 mr-1" />
                        Watch
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section 5: Personal Agents (Coming Soon) */}
      <section className="py-16 px-6 cultural-bg">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Visual Left */}
            <div className="space-y-4">
              <div className="cultural-card rounded-lg cultural-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm cultural-text-muted">Agent Builder</span>
                  <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                    Coming Soon
                  </Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "Learning Buddy", desc: "Study assistant with memory", icon: Brain },
                    { name: "Finance Advisor", desc: "Personal investment helper", icon: Zap },
                    { name: "Content Wizard", desc: "Multi-platform content creator", icon: Sparkles },
                    { name: "Research Assistant", desc: "Academic paper analyzer", icon: FileText }
                  ].map((agent, index) => (
                    <div key={index} className="cultural-card cultural-border rounded p-3">
                      <div className="flex items-center space-x-3">
                        <agent.icon className="w-5 h-5 cultural-text-accent" />
                        <div>
                          <h4 className="text-sm font-medium cultural-text-primary">{agent.name}</h4>
                          <p className="text-xs cultural-text-muted">{agent.desc}</p>
                        </div>
                        <Settings className="w-4 h-4 cultural-text-muted ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Text Right */}
            <div className="space-y-6">
              <h2 className="text-4xl font-bold cultural-text-primary">
                Personal AI Agents
                <br />
                <span className="text-accent">(Coming Soon)</span>
              </h2>
              <p className="text-lg cultural-text-muted leading-relaxed">
                Build your own learning buddy, finance advisor, content wizard, or researcher. Customizable workflows with multiple model support.
              </p>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Star className="w-5 h-5 text-purple-400" />
                  <span>Custom personality and expertise</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Star className="w-5 h-5 text-purple-400" />
                  <span>Multi-model workflows</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Star className="w-5 h-5 text-purple-400" />
                  <span>Long-term memory and learning</span>
                </div>
              </div>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Join Waitlist
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 px-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold cultural-text-primary">
              Join the Future of
              <br />
              <span className="text-accent">Multimodal AI</span>
            </h2>
            
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              {BILLING_PLANS.filter(p => ['student', 'pro', 'team'].includes(p.id)).map((plan, index) => (
                <Card key={index} className={`relative cultural-card cultural-border ${plan.popular ? 'ring-2 ring-blue-500' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white">
                      Most Popular
                    </Badge>
                  )}
                  <CardContent className="p-6 text-center">
                    <h3 className="text-xl font-bold mb-2 cultural-text-primary">{plan.name}</h3>
                    <div className="text-3xl font-bold mb-4">
                      ${plan.monthlyPrice}
                      <span className="text-sm cultural-text-muted">/month</span>
                    </div>
                    <ul className="space-y-2 mb-6 text-sm cultural-text-muted">
                      {plan.features.slice(0, 4).map((feature, fIndex) => (
                        <li key={fIndex} className="flex items-center justify-center">
                          <Check className="w-4 h-4 mr-2 text-green-400" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link href={user ? "/billing" : "/signup"}>
                      <Button className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        {plan.id === 'student' ? 'Start Learning' : `Upgrade to ${plan.name}`}
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Social Proof */}
            <div className="mt-12 space-y-4">
              <p className="cultural-text-muted">Trusted by developers worldwide</p>
              <div className="flex justify-center items-center space-x-8">
                {["500+", "10K+", "50+"].map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold cultural-text-primary">{stat}</div>
                    <div className="text-xs cultural-text-muted">
                      {index === 0 ? "Companies" : index === 1 ? "Developers" : "Countries"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Final CTA */}
            <div className="mt-12">
              <Link href={user ? "/dashboard" : "/signup"}>
                <Button size="lg" className="cultural-primary cultural-primary-hover px-12 py-4 text-lg">
                  {user ? "Go to Dashboard" : "Start Building Today"}
                  <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
              </Link>
              <p className="mt-4 text-sm cultural-text-muted">
                No credit card required • 5 free messages daily • Upgrade anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="cultural-card border-t cultural-border py-8 px-6">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="cultural-text-muted text-sm">
              © 2024 Aspendos. All rights reserved.
            </div>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <Link href="/privacy" className="cultural-text-muted hover:cultural-text-primary text-sm">Privacy</Link>
              <Link href="/terms" className="cultural-text-muted hover:cultural-text-primary text-sm">Terms</Link>
              <Link href="/contact" className="cultural-text-muted hover:cultural-text-primary text-sm">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
