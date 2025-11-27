import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

interface SearchPyramidProps {
  candidates: Array<{
    hardSkillScore?: number | null;
    fitScore?: number | null;
    firstName?: string;
    lastName?: string;
    currentTitle?: string;
    currentCompany?: string;
  }>;
}

export function SearchPyramid({ candidates }: SearchPyramidProps) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  
  // Pyramid tiers based on fit score (0-100 scale)
  const tiers = [
    { min: 70, max: 100, label: 'ELITE (70+)', color: 'bg-purple-600', labelColor: 'text-purple-600', desc: 'Ready to present' },
    { min: 50, max: 69,  label: 'PROMISING (50-69)', color: 'bg-blue-600', labelColor: 'text-blue-600', desc: 'Strong candidates' },
    { min: 30, max: 49,  label: 'MAYBE (30-49)', color: 'bg-yellow-500', labelColor: 'text-yellow-600', desc: 'Possible backups' },
    { min: 0,  max: 29,  label: 'REJECTED (<30)', color: 'bg-gray-400', labelColor: 'text-gray-600', desc: 'Market intelligence' },
  ];

  const getScore = (c: any) => c.fitScore ?? c.hardSkillScore ?? 0;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">Search Pyramid</CardTitle>
        <p className="text-sm text-muted-foreground">Candidate quality distribution - all evaluated</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {tiers.map(tier => {
          const tierCandidates = candidates.filter(c => {
            const score = getScore(c);
            return score >= tier.min && score <= tier.max;
          });
          const count = tierCandidates.length;

          const maxCount = Math.max(...tiers.map(t => 
            candidates.filter(c => {
              const score = getScore(c);
              return score >= t.min && score <= t.max;
            }).length
          ), 1);

          const widthPercent = count === 0 ? 0 : Math.max(15, (count / maxCount) * 100);
          const isExpanded = expandedTier === tier.label;

          return (
            <div key={tier.min} data-testid={`pyramid-tier-${tier.label}`}>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto mb-2 hover:no-default-hover-elevate"
                onClick={() => setExpandedTier(isExpanded ? null : tier.label)}
              >
                <div className="flex justify-between items-baseline text-sm w-full">
                  <span className={`font-bold text-2xl ${tier.labelColor}`}>{count}</span>
                  <div className="flex-1 text-left ml-4">
                    <span className="text-muted-foreground font-medium">{tier.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">({tier.desc})</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </Button>
              
              <div className="h-12 rounded-r-full overflow-hidden bg-muted/40 mb-2">
                <div 
                  className={`${tier.color} h-full transition-all duration-1000 ease-out flex items-center px-3`}
                  style={{ width: `${widthPercent}%` }}
                >
                  {count > 0 && (
                    <span className="text-white text-xs font-medium whitespace-nowrap">
                      {count} {count === 1 ? 'candidate' : 'candidates'}
                    </span>
                  )}
                </div>
              </div>

              {isExpanded && count > 0 && (
                <div className="mb-4 ml-4 space-y-2 max-h-40 overflow-y-auto text-xs">
                  {tierCandidates.map((c, idx) => (
                    <div key={idx} className="text-muted-foreground border-l border-muted pl-3 py-1">
                      <div className="font-medium">{c.firstName} {c.lastName}</div>
                      <div className="text-xs">{c.currentTitle} at {c.currentCompany}</div>
                      <div className="text-xs font-semibold text-primary">Fit: {Math.round(getScore(c))}/100</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        
        <div className="mt-6 pt-6 border-t">
          <div className="text-center">
            <div className="text-4xl font-bold" data-testid="text-total-candidates">{candidates.length}</div>
            <div className="text-sm text-muted-foreground mt-1">Total Candidates Evaluated</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
