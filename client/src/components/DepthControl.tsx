import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Trophy, Target, Network, Globe } from "lucide-react";

type DepthTarget = 'elite_8' | 'elite_15' | 'standard_25' | 'deep_60' | 'market_scan' | '8_elite' | '20_standard' | '50_at_60' | '100_plus';

interface DepthControlProps {
  current: DepthTarget;
  isRunning: boolean;
  onChange: (newTarget: DepthTarget) => void;
}

export function DepthControl({ current, isRunning, onChange }: DepthControlProps) {
  const options = [
    { 
      value: 'elite_8' as const, 
      legacyValue: '8_elite' as const,
      label: 'Elite 8', 
      subtitle: '≥88% hard skills',
      desc: 'C-suite, PE CFO/COO, Fund Partners', 
      price: '$149',
      icon: Trophy,
      badge: 'Premium'
    },
    { 
      value: 'elite_15' as const,
      legacyValue: null,
      label: 'Elite 15', 
      subtitle: '≥84% hard skills',
      desc: 'VP/SVP, GM, Functional Heads', 
      price: '$199',
      icon: Sparkles,
      badge: 'Premium'
    },
    { 
      value: 'standard_25' as const,
      legacyValue: '20_standard' as const,
      label: 'Standard 25', 
      subtitle: '≥76% hard skills',
      desc: 'Director-level, Senior roles', 
      price: '$129',
      icon: Target,
      badge: 'Popular'
    },
    { 
      value: 'deep_60' as const,
      legacyValue: '50_at_60' as const,
      label: 'Deep 60', 
      subtitle: '≥66% hard skills',
      desc: 'Specialists, wide net, niche roles', 
      price: '$149',
      icon: Network,
      badge: null
    },
    { 
      value: 'market_scan' as const,
      legacyValue: '100_plus' as const,
      label: 'Market Scan (150+)', 
      subtitle: '≥58% hard skills',
      desc: 'Intel, mapping, benchmarking', 
      price: '$179',
      icon: Globe,
      badge: 'Flat Fee'
    },
  ];

  return (
    <Card className="shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Search Depth & Pricing</CardTitle>
        <p className="text-xs text-muted-foreground">Value-based pricing: Elite searches cost MORE (precision is valuable)</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map(opt => {
          // Support both new and legacy tier values during transition
          const isSelected = current === opt.value || current === opt.legacyValue;
          const Icon = opt.icon;
          
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              data-testid={`button-depth-${opt.value}`}
              className={`w-full text-left p-3 rounded-md transition-all ${
                isSelected 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'bg-muted/40 hover-elevate active-elevate-2'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{opt.label}</span>
                      {opt.badge && (
                        <Badge 
                          variant={isSelected ? "secondary" : "outline"} 
                          className="text-xs px-1.5 py-0"
                        >
                          {opt.badge}
                        </Badge>
                      )}
                    </div>
                    <div className={`text-xs ${isSelected ? 'opacity-90' : 'text-muted-foreground'}`}>
                      {opt.subtitle}
                    </div>
                    <div className={`text-xs ${isSelected ? 'opacity-80' : 'text-muted-foreground'} mt-0.5`}>
                      {opt.desc}
                    </div>
                  </div>
                </div>
                <div className={`text-sm font-bold flex-shrink-0 ${isSelected ? '' : 'text-muted-foreground'}`}>
                  {opt.price}
                </div>
              </div>
            </button>
          );
        })}
        
        {isRunning && (
          <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-500 font-medium text-sm justify-center py-2 bg-green-50 dark:bg-green-950/20 rounded-md" data-testid="status-searching">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI searching until target reached...</span>
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Why does Elite 8 cost more than Market Scan?</p>
          <p className="leading-relaxed">
            Finding the 8 perfect candidates who can be your next PE CFO adds more value than showing you 150 average résumés. 
            <span className="font-medium text-foreground"> You're paying for precision, not noise.</span>
          </p>
          <p className="mt-2 text-[11px] opacity-80">
            Just like real executive search firms charge 20-33% of first-year comp for quality placements.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
