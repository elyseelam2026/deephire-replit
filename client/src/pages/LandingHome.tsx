import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Briefcase, Users, ArrowRight, CheckCircle, Zap, TrendingUp, Layers } from "lucide-react";

export default function LandingHome() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Navigation - Premium */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/40 dark:bg-slate-950/40 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">DeepHire</div>
          </div>
          <div className="flex gap-3 items-center">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/client")} data-testid="nav-client-portal" className="text-slate-300 hover:text-white">
              Clients
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/recruiting")} data-testid="nav-recruiting-portal" className="text-slate-300 hover:text-white">
              Recruiters
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/researchers")} data-testid="nav-researchers-portal" className="text-slate-300 hover:text-white">
              Researchers
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/admin")} data-testid="nav-admin-portal" className="text-slate-300 hover:text-white">
              Admin
            </Button>
            <Button onClick={() => setLocation("/auth")} data-testid="nav-sign-in" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0">
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero - High Tech */}
      <section className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-20">
          {/* Accent line */}
          <div className="inline-block mb-6 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 border border-blue-400/30">
            <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">AI-Powered Talent Intelligence</span>
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight">
            Exceptional Talent.<br />Every Industry.<br />Now.
          </h1>
          <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Advanced AI-powered talent sourcing platform designed for enterprise teams. Discover exceptional candidates in minutes using research-driven intelligence and precision matching across every industry.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => setLocation("/auth")} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 text-lg px-8 gap-2">
              Get Started <ArrowRight className="h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation("/auth?role=company")} className="border-slate-600 text-slate-100 hover:bg-slate-900">
              Request Demo
            </Button>
          </div>
        </div>

        {/* Marketplace - Modern Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          {/* Candidates */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 p-8 hover-elevate">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg inline-block mb-6 group-hover:from-blue-500/40 group-hover:to-blue-600/40 transition-colors">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">For Candidates</h3>
              <p className="text-slate-300 mb-6">
                AI discovers your ideal next role. We search globally and match opportunities perfectly aligned with your expertise.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Precision AI job matching</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Exclusive opportunities</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Direct company access</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0" 
                onClick={() => setLocation("/auth?role=candidate")}
                data-testid="button-candidate-signup"
              >
                Join Now
              </Button>
            </div>
          </div>

          {/* Companies */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 p-8 hover-elevate md:scale-105">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg inline-block mb-6 group-hover:from-purple-500/40 group-hover:to-pink-600/40 transition-colors">
                <Briefcase className="h-8 w-8 text-purple-400" />
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-600/20 border border-purple-400/30 mb-4">
                <span className="text-xs font-semibold text-purple-300">FEATURED</span>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">For Companies</h3>
              <p className="text-slate-300 mb-6">
                Access pre-vetted talent pools and leverage AI to identify perfect-fit candidates. From startups to enterprises.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Verified candidate database</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Advanced search AI</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Talent intelligence</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0" 
                onClick={() => setLocation("/auth?role=company")}
                data-testid="button-company-signup"
              >
                Start Hiring
              </Button>
            </div>
          </div>

          {/* Recruiters */}
          <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 p-8 hover-elevate">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-teal-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-teal-600/20 rounded-lg inline-block mb-6 group-hover:from-cyan-500/40 group-hover:to-teal-600/40 transition-colors">
                <Layers className="h-8 w-8 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-white">For Recruiters</h3>
              <p className="text-slate-300 mb-6">
                Professional platform for managing searches, pipelines, and teams. Built for executive search firms and agencies.
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Full case management</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Research tools</span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle className="h-5 w-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-300">Team collaboration</span>
                </li>
              </ul>
              <Button 
                className="w-full bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white border-0"
                onClick={() => setLocation("/recruiting")}
                data-testid="button-recruiter-access"
              >
                Access Portal
              </Button>
            </div>
          </div>
        </div>

        {/* Stats - Premium */}
        <div className="mt-32 grid md:grid-cols-3 gap-8">
          <div className="relative rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <div className="text-4xl font-bold text-white">10x</div>
                <p className="text-slate-400 text-sm">Faster discovery</p>
              </div>
            </div>
          </div>
          <div className="relative rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-lg">
                <CheckCircle className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <div className="text-4xl font-bold text-white">92%</div>
                <p className="text-slate-400 text-sm">Match accuracy</p>
              </div>
            </div>
          </div>
          <div className="relative rounded-xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-8">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-teal-600/20 rounded-lg">
                <Zap className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <div className="text-4xl font-bold text-white">Instant</div>
                <p className="text-slate-400 text-sm">AI results</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Premium */}
      <footer className="border-t border-slate-800/50 mt-32 py-12 px-6 text-center text-slate-400">
        <p>© 2025 DeepHire. Intelligent talent sourcing for every industry.</p>
      </footer>
    </div>
  );
}
