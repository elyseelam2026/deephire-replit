import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Download,
  Play,
  Mail
} from 'lucide-react';

interface DashboardData {
  hasData: boolean;
  message?: string;
  currentScore?: number;
  improvement?: number;
  trend?: 'improving' | 'declining' | 'stable';
  latestAudit?: {
    id: number;
    runAt: string;
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
    autoFixed: number;
    flaggedForReview: number;
    manualQueue: number;
  };
  manualQueue?: {
    pending: number;
    inProgress: number;
    total: number;
  };
  aiPerformance?: {
    totalAttempts: number;
    successRate: number;
    avgConfidence: number;
  };
}

export default function DataQualityDashboard() {
  const { data: dashboard, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['/api/data-quality/dashboard']
  });

  const runAudit = async () => {
    await fetch('/api/data-quality/run-audit', { method: 'POST' });
    setTimeout(() => refetch(), 2000); // Refresh after 2 seconds
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboard?.hasData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Data Quality System</CardTitle>
            <CardDescription>No audit runs yet</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Run your first audit to start monitoring data quality.</p>
            <Button onClick={runAudit} data-testid="button-run-first-audit">
              <Play className="mr-2 h-4 w-4" />
              Run First Audit
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const TrendIcon = dashboard.trend === 'improving' ? TrendingUp : dashboard.trend === 'declining' ? TrendingDown : Minus;
  const trendColor = dashboard.trend === 'improving' ? 'text-green-600' : dashboard.trend === 'declining' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Quality Dashboard</h1>
          <p className="text-muted-foreground">AI-powered data integrity monitoring</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild data-testid="button-manual-queue">
            <Link href="/admin/data-quality/queue">
              <Clock className="mr-2 h-4 w-4" />
              Manual Queue ({dashboard.manualQueue?.pending || 0})
            </Link>
          </Button>
          <Button onClick={runAudit} data-testid="button-run-audit">
            <Play className="mr-2 h-4 w-4" />
            Run Audit
          </Button>
        </div>
      </div>

      {/* Quality Score Card */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Data Quality Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-baseline gap-4">
                <span className="text-6xl font-bold" data-testid="text-quality-score">
                  {dashboard.currentScore}/100
                </span>
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-5 w-5" />
                  <span className="text-lg font-semibold">
                    {dashboard.improvement! > 0 ? '+' : ''}{dashboard.improvement}
                  </span>
                </div>
              </div>
              <Progress value={dashboard.currentScore} className="mt-4 h-3" />
              <p className="mt-2 text-sm text-muted-foreground">
                {dashboard.currentScore! >= 90 ? 'Excellent' : 
                 dashboard.currentScore! >= 75 ? 'Good' : 
                 dashboard.currentScore! >= 60 ? 'Fair' : 'Needs Improvement'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest Audit Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-issues">
              {dashboard.latestAudit?.totalIssues}
            </div>
            <div className="mt-2 flex gap-2 text-xs">
              <Badge variant="destructive">P0: {dashboard.latestAudit?.errors}</Badge>
              <Badge className="bg-orange-500">P1: {dashboard.latestAudit?.warnings}</Badge>
              <Badge variant="secondary">P2: {dashboard.latestAudit?.info}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Auto-Fixed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-auto-fixed">
              {dashboard.latestAudit?.autoFixed}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboard.latestAudit?.totalIssues ? 
                Math.round((dashboard.latestAudit.autoFixed / dashboard.latestAudit.totalIssues) * 100) : 0}% of issues
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manual Queue</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="text-manual-queue">
              {dashboard.manualQueue?.pending}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {dashboard.manualQueue?.inProgress} in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600" data-testid="text-success-rate">
              {dashboard.aiPerformance?.successRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Avg confidence: {dashboard.aiPerformance?.avgConfidence}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Latest Audit Details */}
      <Card>
        <CardHeader>
          <CardTitle>Latest Audit Run</CardTitle>
          <CardDescription>
            Run ID: {dashboard.latestAudit?.id} • {new Date(dashboard.latestAudit?.runAt!).toLocaleString()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h4 className="font-semibold mb-2">Issue Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Critical (P0):</span>
                  <span className="font-medium">{dashboard.latestAudit?.errors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Important (P1):</span>
                  <span className="font-medium">{dashboard.latestAudit?.warnings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Enhancement (P2):</span>
                  <span className="font-medium">{dashboard.latestAudit?.info}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">AI Remediation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Auto-fixed:</span>
                  <span className="font-medium text-green-600">{dashboard.latestAudit?.autoFixed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Flagged for review:</span>
                  <span className="font-medium text-orange-600">{dashboard.latestAudit?.flaggedForReview}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Manual queue:</span>
                  <span className="font-medium">{dashboard.latestAudit?.manualQueue}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Actions</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => window.open(`/api/data-quality/report/${dashboard.latestAudit?.id}`, '_blank')}
                  data-testid="button-download-csv"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV Report
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => window.open(`/api/data-quality/email-preview/${dashboard.latestAudit?.id}`, '_blank')}
                  data-testid="button-preview-email"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Preview Email Report
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
