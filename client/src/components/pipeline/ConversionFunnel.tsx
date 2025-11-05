import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, TrendingDown, Clock, Users, AlertTriangle,
  CheckCircle, XCircle, ArrowRight, Target
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  currentTitle?: string | null;
  currentCompany?: string | null;
}

interface JobCandidate {
  id: number;
  jobId: number;
  candidateId: number;
  matchScore: number | null;
  searchTier: number | null;
  status: string;
  statusHistory?: Array<{ status: string; timestamp: string }> | null;
  createdAt: string;
  candidate: Candidate;
}

interface ConversionFunnelProps {
  candidates: JobCandidate[];
  jobId: number;
}

const PIPELINE_STAGES = [
  { key: 'recommended', label: 'Recommended', color: 'bg-blue-500', icon: Users },
  { key: 'reviewed', label: 'Reviewed', color: 'bg-purple-500', icon: CheckCircle },
  { key: 'shortlisted', label: 'Shortlisted', color: 'bg-yellow-500', icon: Target },
  { key: 'presented', label: 'Presented', color: 'bg-orange-500', icon: ArrowRight },
  { key: 'interview', label: 'Interview', color: 'bg-cyan-500', icon: Users },
  { key: 'offer', label: 'Offer', color: 'bg-green-500', icon: CheckCircle },
  { key: 'placed', label: 'Placed', color: 'bg-emerald-600', icon: CheckCircle },
];

function calculateStageMetrics(candidates: JobCandidate[], stage: string, allCandidates: JobCandidate[]) {
  const stageCandidates = candidates.filter(c => c.status === stage);
  const count = stageCandidates.length;
  
  const avgMatchScore = stageCandidates.length > 0
    ? stageCandidates
        .filter(c => c.matchScore != null)
        .reduce((sum, c) => sum + (c.matchScore || 0), 0) / 
        stageCandidates.filter(c => c.matchScore != null).length
    : 0;

  const avgTimeInStage = stageCandidates.length > 0
    ? calculateAverageTimeInStage(stageCandidates)
    : 0;

  const historicalCount = calculateHistoricalStageCount(allCandidates, stage);

  return { count, avgMatchScore, avgTimeInStage, historicalCount };
}

function calculateHistoricalStageCount(candidates: JobCandidate[], stage: string): number {
  return candidates.filter(c => {
    if (c.status === stage) return true;
    
    const history = c.statusHistory || [];
    return history.some(h => h.status === stage);
  }).length;
}

function calculateStageTransition(candidates: JobCandidate[], fromStage: string, toStage: string): number {
  let transitionCount = 0;
  
  for (const candidate of candidates) {
    const history = candidate.statusHistory || [];
    
    if (history.length === 0) {
      if (candidate.status === fromStage || candidate.status === toStage) {
        continue;
      }
    }
    
    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      const next = history[i + 1];
      
      if (current.status === fromStage) {
        if (next && next.status === toStage) {
          transitionCount++;
          break;
        }
        if (!next && candidate.status === toStage) {
          transitionCount++;
          break;
        }
      }
    }
    
    if (history.length === 0 && candidate.status === toStage) {
      continue;
    }
  }
  
  return transitionCount;
}

function calculateAverageTimeInStage(candidates: JobCandidate[]): number {
  const times = candidates.map(c => {
    try {
      const statusHistory = c.statusHistory || [];
      if (statusHistory.length === 0) {
        const createdDate = new Date(c.createdAt);
        if (isNaN(createdDate.getTime())) return 0;
        return Date.now() - createdDate.getTime();
      }
      
      const lastChange = statusHistory[statusHistory.length - 1];
      if (!lastChange || !lastChange.timestamp) {
        const createdDate = new Date(c.createdAt);
        if (isNaN(createdDate.getTime())) return 0;
        return Date.now() - createdDate.getTime();
      }
      
      const lastChangeDate = new Date(lastChange.timestamp);
      if (isNaN(lastChangeDate.getTime())) return 0;
      return Date.now() - lastChangeDate.getTime();
    } catch {
      return 0;
    }
  }).filter(t => t > 0);

  if (times.length === 0) return 0;
  return times.reduce((sum, t) => sum + t, 0) / times.length;
}

function formatDuration(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h`;
  return '< 1h';
}

export function ConversionFunnel({ candidates, jobId }: ConversionFunnelProps) {
  const rejectedCount = candidates.filter(c => c.status === 'rejected').length;
  const activeCount = candidates.filter(c => c.status !== 'rejected').length;
  const placedCount = candidates.filter(c => c.status === 'placed').length;
  
  const totalCandidates = candidates.length;
  const conversionRate = totalCandidates > 0 ? (placedCount / totalCandidates) * 100 : 0;

  const stageMetrics = PIPELINE_STAGES.map((stage, index) => {
    const metrics = calculateStageMetrics(candidates, stage.key, candidates);
    const nextStage = PIPELINE_STAGES[index + 1];
    
    const stageConversionRate = nextStage && metrics.historicalCount > 0
      ? (calculateStageTransition(candidates, stage.key, nextStage.key) / metrics.historicalCount) * 100
      : 0;

    return {
      ...stage,
      ...metrics,
      stageConversionRate,
      percentage: totalCandidates > 0 ? (metrics.count / totalCandidates) * 100 : 0,
    };
  });

  const bottleneckStage = stageMetrics.reduce((min, stage) => 
    stage.stageConversionRate > 0 && stage.stageConversionRate < (min.stageConversionRate || 100)
      ? stage
      : min,
    stageMetrics[0]
  );

  return (
    <div className="space-y-6" data-testid="conversion-funnel">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCandidates}</div>
            <p className="text-xs text-muted-foreground">
              {activeCount} active · {rejectedCount} rejected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Placed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{placedCount}</div>
            <p className="text-xs text-muted-foreground">
              {conversionRate.toFixed(1)}% conversion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground">
              {totalCandidates > 0 ? ((rejectedCount / totalCandidates) * 100).toFixed(1) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bottleneck</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{bottleneckStage.label}</div>
            <p className="text-xs text-muted-foreground">
              {bottleneckStage.stageConversionRate > 0 
                ? `${bottleneckStage.stageConversionRate.toFixed(1)}% progress`
                : 'No data'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Funnel Visualization */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Funnel</CardTitle>
          <CardDescription>
            Candidate flow through each stage with conversion rates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stageMetrics.map((stage, index) => {
            const Icon = stage.icon;
            const isBottleneck = stage.key === bottleneckStage.key && stage.stageConversionRate < 50;

            return (
              <div key={stage.key} className="space-y-2">
                {/* Stage Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`${stage.color} h-2 w-2 rounded-full`}></div>
                    <span className="text-sm font-medium">{stage.label}</span>
                    {isBottleneck && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Bottleneck
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {stage.count}
                    </span>
                    {stage.avgMatchScore > 0 && (
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {Math.round(stage.avgMatchScore)}%
                      </span>
                    )}
                    {stage.avgTimeInStage > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(stage.avgTimeInStage)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                  <Progress 
                    value={stage.percentage} 
                    className="h-8"
                    data-testid={`progress-${stage.key}`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-medium text-white mix-blend-difference">
                      {stage.percentage.toFixed(1)}% of pipeline
                    </span>
                  </div>
                </div>

                {/* Conversion Rate Arrow */}
                {index < stageMetrics.length - 1 && stage.count > 0 && (
                  <div className="flex items-center gap-2 ml-4 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3" />
                    {stage.stageConversionRate > 0 ? (
                      <>
                        <span className={
                          stage.stageConversionRate >= 70 ? 'text-green-600' :
                          stage.stageConversionRate >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }>
                          {stage.stageConversionRate.toFixed(1)}% advance
                        </span>
                        to next stage
                      </>
                    ) : (
                      <span className="text-muted-foreground">No progression yet</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Pipeline Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {conversionRate >= 20 && (
            <div className="flex items-start gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Strong conversion rate</p>
                <p className="text-muted-foreground">
                  {conversionRate.toFixed(1)}% of candidates are being successfully placed
                </p>
              </div>
            </div>
          )}

          {bottleneckStage.stageConversionRate > 0 && bottleneckStage.stageConversionRate < 50 && (
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5" />
              <div>
                <p className="font-medium">Bottleneck detected at {bottleneckStage.label}</p>
                <p className="text-muted-foreground">
                  Only {bottleneckStage.stageConversionRate.toFixed(1)}% of candidates progress to the next stage
                </p>
              </div>
            </div>
          )}

          {rejectedCount > activeCount && totalCandidates > 5 && (
            <div className="flex items-start gap-2 text-sm">
              <TrendingDown className="h-4 w-4 text-red-500 mt-0.5" />
              <div>
                <p className="font-medium">High rejection rate</p>
                <p className="text-muted-foreground">
                  {((rejectedCount / totalCandidates) * 100).toFixed(1)}% of candidates have been rejected
                </p>
              </div>
            </div>
          )}

          {totalCandidates < 5 && (
            <div className="flex items-start gap-2 text-sm">
              <Users className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Building pipeline</p>
                <p className="text-muted-foreground">
                  Add more candidates to generate meaningful conversion insights
                </p>
              </div>
            </div>
          )}

          {activeCount > 0 && placedCount === 0 && totalCandidates > 3 && (
            <div className="flex items-start gap-2 text-sm">
              <Clock className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Pipeline in progress</p>
                <p className="text-muted-foreground">
                  {activeCount} candidates are actively moving through the pipeline
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
