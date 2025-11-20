import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, TrendingUp } from "lucide-react";

interface MarketCoverageProps {
  jobId: number;
  presentedCount: number; // Number of quality candidates presented
}

export function MarketCoverage({ jobId, presentedCount }: MarketCoverageProps) {
  // Fetch screened-out candidates for this job
  const { data: clues } = useQuery<Array<{
    id: number;
    tier: string;
    predictedScore: number;
    jobTitle: string | null;
    companyName: string | null;
  }>>({
    queryKey: ['/api/candidate-clues', jobId],
    enabled: !!jobId,
  });

  const screenedOutCount = clues?.filter(c => c.tier === 'screened_out').length || 0;
  const clueCount = clues?.filter(c => c.tier === 'clue').length || 0;
  const totalScanned = presentedCount + clueCount + screenedOutCount;
  
  const qualityRate = totalScanned > 0 
    ? ((presentedCount / totalScanned) * 100).toFixed(1) 
    : '0.0';

  return (
    <Card className="shadow-lg" data-testid="card-market-coverage">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Market Coverage
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Proof of thorough market scan
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Scanned */}
        <div className="text-center pb-4 border-b">
          <div className="text-5xl font-bold text-primary" data-testid="text-total-scanned">
            {totalScanned.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Total Candidates Scanned
          </div>
        </div>

        {/* Quality Breakdown */}
        <div className="space-y-3">
          {/* Presented Candidates (Quality Gold) */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100">
                  Quality Candidates
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  ≥60% hard skills - Presented to you
                </div>
              </div>
            </div>
            <Badge variant="default" className="bg-green-600 text-white" data-testid="badge-presented-count">
              {presentedCount}
            </Badge>
          </div>

          {/* Clues (Market Intelligence) */}
          {clueCount > 0 && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-yellow-600" />
                <div>
                  <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                    Market Clues
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">
                    60-67% - Available for future searches
                  </div>
                </div>
              </div>
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-900 dark:bg-yellow-900 dark:text-yellow-100" data-testid="badge-clue-count">
                {clueCount}
              </Badge>
            </div>
          )}

          {/* Screened Out (Market Coverage Proof) */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-gray-500" />
              <div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  Screened Out
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  &lt;60% - Rejected for not meeting standards
                </div>
              </div>
            </div>
            <Badge variant="outline" className="text-gray-600 dark:text-gray-400" data-testid="badge-screened-out-count">
              {screenedOutCount}
            </Badge>
          </div>
        </div>

        {/* Quality Rate */}
        <div className="mt-6 pt-4 border-t text-center">
          <div className="text-3xl font-bold text-primary">
            {qualityRate}%
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Quality Candidate Rate
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            We scanned {totalScanned} candidates and presented only the top {presentedCount} who meet your standards.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
