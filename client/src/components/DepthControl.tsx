import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface DepthControlProps {
  current: '8_elite' | '20_standard' | '50_at_60' | '100_plus';
  isRunning: boolean;
  onChange: (newTarget: '8_elite' | '20_standard' | '50_at_60' | '100_plus') => void;
}

export function DepthControl({ current, isRunning, onChange }: DepthControlProps) {
  const options = [
    { 
      value: '8_elite' as const, 
      label: 'Top 8 Elites Only', 
      desc: '≥85% hard skills', 
      color: 'purple'
    },
    { 
      value: '20_standard' as const, 
      label: 'Top 20 (Standard)', 
      desc: '≥75% hard skills', 
      color: 'blue'
    },
    { 
      value: '50_at_60' as const, 
      label: 'Deep Dive – 50 at ≥60%', 
      desc: 'Recommended', 
      color: 'green'
    },
    { 
      value: '100_plus' as const, 
      label: 'Exhaustive – 100+', 
      desc: 'Go nuclear', 
      color: 'yellow'
    },
  ];

  return (
    <Card className="shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Search Depth Target</CardTitle>
        <p className="text-xs text-muted-foreground">AI searches until target reached</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map(opt => {
          const isSelected = current === opt.value;
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
              <div className="font-medium text-sm">{opt.label}</div>
              <div className={`text-xs ${isSelected ? 'opacity-90' : 'text-muted-foreground'}`}>
                {opt.desc}
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
      </CardContent>
    </Card>
  );
}
