import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Search, Globe, Database, Zap } from "lucide-react";

interface DiscoveryProgressProps {
  jobTitle: string;
  isDiscovering?: boolean;
}

export default function DiscoveryProgress({ jobTitle, isDiscovering = true }: DiscoveryProgressProps) {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Cycle through steps with animation
  useEffect(() => {
    if (!isDiscovering) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % 4);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isDiscovering]);

  const steps = [
    { icon: Search, label: "Grok Searching", desc: "Generating search strategies..." },
    { icon: Globe, label: "Google Finding", desc: "Discovering LinkedIn profiles..." },
    { icon: Database, label: "BrightData Scraping", desc: "Extracting profile data..." },
    { icon: Zap, label: "Scoring Candidates", desc: "Evaluating fit..." }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted/50">
      {/* Main title */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-2">Discovering Talent</h2>
        <p className="text-lg text-muted-foreground">Searching for {jobTitle} candidates...</p>
      </div>

      {/* Steps visualization */}
      <div className="w-full max-w-2xl space-y-6">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          
          return (
            <div key={idx} className="relative">
              {/* Connection line */}
              {idx < steps.length - 1 && (
                <div className={`absolute left-6 top-16 w-1 h-8 transition-all duration-500 ${
                  isCompleted ? 'bg-green-500' : isActive ? 'bg-blue-500 animate-pulse' : 'bg-muted-foreground/20'
                }`} />
              )}
              
              {/* Step card */}
              <Card className={`p-6 transition-all duration-500 transform ${
                isActive 
                  ? 'ring-2 ring-blue-500 shadow-lg scale-105' 
                  : isCompleted
                  ? 'ring-1 ring-green-500/50 bg-green-500/5'
                  : 'opacity-50'
              }`}>
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className={`mt-1 p-3 rounded-lg transition-all duration-500 ${
                    isActive 
                      ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' 
                      : isCompleted
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'animate-spin' : ''}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className={`font-semibold text-lg ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 
                        isCompleted ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                      }`}>
                        {step.label}
                      </h3>
                      {isActive && (
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                      {isCompleted && <span className="text-green-600 dark:text-green-400 text-sm font-medium">✓ Done</span>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{step.desc}</p>
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Footer message */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Candidates will appear below as they're discovered...</p>
        <div className="mt-3 flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
