import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Building2, Users, CheckCircle2 } from "lucide-react";

interface DiscoveryProgressProps {
  jobTitle: string;
  targetCompanies?: string[];
  isDiscovering?: boolean;
  jobId?: number;
}

export default function DiscoveryProgress({ 
  jobTitle, 
  targetCompanies,
  isDiscovering = true,
  jobId
}: DiscoveryProgressProps) {
  const [companies, setCompanies] = useState<string[]>(targetCompanies || []);

  // Fetch target companies if not provided
  useEffect(() => {
    if (targetCompanies && targetCompanies.length > 0) {
      setCompanies(targetCompanies);
      return;
    }

    if (!jobId) return;

    const fetchCompanies = async () => {
      try {
        const response = await fetch(`/api/jobs/${jobId}/target-companies`);
        if (response.ok) {
          const data = await response.json();
          if (data.targetCompanies && data.targetCompanies.length > 0) {
            setCompanies(data.targetCompanies);
          }
        }
      } catch (error) {
        console.error('Failed to fetch target companies:', error);
        // Fallback to default if fetch fails
        setCompanies(["Goldman Sachs", "JPMorgan Chase", "Morgan Stanley", "Bank of America", "Citigroup", "Wells Fargo"]);
      }
    };

    fetchCompanies();
  }, [jobId, targetCompanies]);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Cycle through steps with animation
  useEffect(() => {
    if (!isDiscovering) return;
    
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % 3);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isDiscovering]);

  const steps = [
    { 
      icon: Building2, 
      title: "Identifying Target Companies",
      companies: companies
    },
    { 
      icon: Users, 
      title: "Finding Target Candidates",
      desc: "Searching for executives at identified companies..."
    },
    { 
      icon: CheckCircle2, 
      title: "Evaluating Hard Skills",
      desc: "Assessing qualifications for the longlist..."
    }
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-b from-background to-muted/50">
      {/* Main title */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-2">Discovering Talent</h2>
        <p className="text-lg text-muted-foreground">Finding ideal {jobTitle} candidates...</p>
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
                    <Icon className={`w-5 h-5 ${isActive ? 'animate-pulse' : ''}`} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`font-semibold text-lg ${
                        isActive ? 'text-blue-600 dark:text-blue-400' : 
                        isCompleted ? 'text-green-600 dark:text-green-400' : 'text-foreground'
                      }`}>
                        {step.title}
                      </h3>
                      {isActive && (
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                      {isCompleted && <span className="text-green-600 dark:text-green-400 text-sm font-medium">✓</span>}
                    </div>
                    
                    {/* Companies list for step 1 */}
                    {idx === 0 && (
                      <div className={`text-sm transition-all duration-500 ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        <p className="mb-2">Target firms: <span className="font-medium">{step.companies?.join(", ")}</span></p>
                      </div>
                    )}
                    
                    {/* Descriptions for other steps */}
                    {idx !== 0 && (
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Footer message */}
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>Candidates will appear below as they're qualified...</p>
        <div className="mt-3 flex justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
