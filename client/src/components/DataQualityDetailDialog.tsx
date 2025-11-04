import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock, 
  TrendingUp,
  ExternalLink,
  Code,
  Sparkles
} from 'lucide-react';

interface AutoFixedItem {
  attempt: {
    id: number;
    issueId: number;
    reasoning: string;
    confidenceScore: number;
    dataSources: any;
    fixesApplied: any;
    completedAt: string;
    executionTimeMs: number;
  };
  issue: {
    id: number;
    description: string;
    entityType: string;
    entityId: number;
    severity: string;
  };
}

interface Issue {
  id: number;
  description: string;
  severity: string;
  status: string;
  entityType: string;
  entityId: number;
  suggestedFix: string;
  detectedAt: string;
}

interface ManualQueueItem {
  id: number;
  issueId: number;
  priority: string;
  slaDeadline: string;
  status: string;
  assignedTo: string | null;
  notes: string | null;
  createdAt: string;
  issue: {
    description: string;
    entityType: string;
    entityId: number;
    severity: string;
    suggestedFix: string;
  };
  remediationAttempt: {
    reasoning: string;
    confidenceScore: number;
    suggestedAction: any;
  } | null;
}

interface DataQualityDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'total' | 'auto-fixed' | 'manual-queue' | 'performance' | null;
  auditId: number | null;
}

export function DataQualityDetailDialog({ isOpen, onClose, type, auditId }: DataQualityDetailDialogProps) {
  const [selectedTab, setSelectedTab] = useState('all');

  // Fetch auto-fixed details
  const { data: autoFixedData, isLoading: loadingAutoFixed } = useQuery<{ fixes: AutoFixedItem[] }>({
    queryKey: ['/api/data-quality/auto-fixed', auditId],
    queryFn: async () => {
      const res = await fetch(`/api/data-quality/auto-fixed/${auditId}`);
      return res.json();
    },
    enabled: isOpen && type === 'auto-fixed' && !!auditId
  });

  // Fetch all issues
  const { data: issuesData, isLoading: loadingIssues } = useQuery<{ issues: Issue[] }>({
    queryKey: ['/api/data-quality/issues', auditId, selectedTab],
    queryFn: async () => {
      const params = selectedTab !== 'all' ? `?status=${selectedTab}` : '';
      const res = await fetch(`/api/data-quality/issues/${auditId}${params}`);
      return res.json();
    },
    enabled: isOpen && type === 'total' && !!auditId
  });

  // Fetch manual queue items
  const { data: queueData, isLoading: loadingQueue } = useQuery<{ items: ManualQueueItem[] }>({
    queryKey: ['/api/data-quality/manual-queue'],
    enabled: isOpen && type === 'manual-queue'
  });

  // Fetch performance data
  const { data: performanceData } = useQuery<{ performance: any[] }>({
    queryKey: ['/api/data-quality/ai-performance'],
    enabled: isOpen && type === 'performance'
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-orange-500';
      case 'info': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const renderAutoFixedContent = () => {
    if (loadingAutoFixed) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    const fixes = autoFixedData?.fixes || [];

    if (fixes.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No auto-fixed issues in this audit run
        </div>
      );
    }

    return (
      <ScrollArea className="h-[500px]">
        <div className="space-y-4 pr-4">
          {fixes.map((fix) => (
            <Card key={fix.attempt.id} data-testid={`auto-fix-${fix.attempt.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      {fix.issue.description}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {fix.issue.entityType} #{fix.issue.entityId} • Fixed in {fix.attempt.executionTimeMs}ms
                    </CardDescription>
                  </div>
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200">
                    {fix.attempt.confidenceScore}% confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* AI Reasoning */}
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                        AI Reasoning
                      </div>
                      <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                        {fix.attempt.reasoning}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Data Sources */}
                {fix.attempt.dataSources && Object.keys(fix.attempt.dataSources).length > 0 && (
                  <div>
                    <div className="font-semibold text-sm mb-2">Data Sources Used:</div>
                    <div className="space-y-1">
                      {Object.entries(fix.attempt.dataSources).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-sm flex items-start gap-2">
                          <ExternalLink className="h-3 w-3 mt-0.5 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{key}:</span>{' '}
                            <span className="text-muted-foreground">
                              {typeof value === 'string' ? value : JSON.stringify(value)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fixes Applied */}
                {fix.attempt.fixesApplied && (
                  <div>
                    <div className="font-semibold text-sm mb-2">Changes Applied:</div>
                    <div className="bg-muted p-3 rounded font-mono text-xs">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(fix.attempt.fixesApplied, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Fixed at: {new Date(fix.attempt.completedAt).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderTotalIssuesContent = () => {
    if (loadingIssues) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    const issues = issuesData?.issues || [];

    return (
      <div>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All Issues</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="auto_fixed">Auto-Fixed</TabsTrigger>
          </TabsList>
        </Tabs>

        <ScrollArea className="h-[450px]">
          <div className="space-y-2 pr-4">
            {issues.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {selectedTab !== 'all' ? selectedTab : ''} issues found
              </div>
            ) : (
              issues.map((issue) => (
                <Card key={issue.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {issue.entityType} #{issue.entityId}
                        </Badge>
                        <Badge variant="secondary">{issue.status}</Badge>
                      </div>
                      <p className="text-sm font-medium">{issue.description}</p>
                      {issue.suggestedFix && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Suggested: {issue.suggestedFix}
                        </p>
                      )}
                    </div>
                    <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const renderManualQueueContent = () => {
    if (loadingQueue) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    const items = queueData?.items || [];

    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No items in manual intervention queue
        </div>
      );
    }

    const getPriorityColor = (priority: string) => {
      switch (priority) {
        case 'P0': return 'bg-red-500';
        case 'P1': return 'bg-orange-500';
        case 'P2': return 'bg-blue-500';
        default: return 'bg-gray-500';
      }
    };

    return (
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <Badge variant="outline">
                          {item.issue.entityType} #{item.issue.entityId}
                        </Badge>
                        <Badge variant="secondary">{item.status}</Badge>
                      </div>
                      <p className="text-sm font-medium">{item.issue.description}</p>
                    </div>
                  </div>

                  {item.remediationAttempt && (
                    <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg text-sm">
                      <div className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                        AI Suggested Action ({item.remediationAttempt.confidenceScore}% confidence)
                      </div>
                      <p className="text-orange-800 dark:text-orange-200">
                        {item.remediationAttempt.reasoning}
                      </p>
                    </div>
                  )}

                  {item.issue.suggestedFix && (
                    <p className="text-xs text-muted-foreground">
                      Suggested: {item.issue.suggestedFix}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>SLA Deadline: {new Date(item.slaDeadline).toLocaleString()}</span>
                    <span>Created: {new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const renderPerformanceContent = () => {
    const performance = performanceData?.performance || [];

    if (performance.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          No performance data available yet
        </div>
      );
    }

    return (
      <ScrollArea className="h-[500px]">
        <div className="space-y-3 pr-4">
          {performance.map((run) => (
            <Card key={run.auditId}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Audit Run #{run.auditId}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(run.runAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Success Rate:</span>
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                        {run.successRate}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Auto-Fixed:</span>
                      <span className="font-semibold">{run.autoFixed}/{run.totalIssues}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Quality Score:</span>
                      <span className="font-semibold">{run.qualityScore}/100</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    );
  };

  const getDialogContent = () => {
    switch (type) {
      case 'auto-fixed':
        return {
          title: 'AI Auto-Fixed Issues',
          description: 'Detailed view of issues automatically resolved by AI with confidence scores and reasoning',
          content: renderAutoFixedContent()
        };
      case 'total':
        return {
          title: 'All Issues',
          description: 'Complete list of data quality issues detected in this audit',
          content: renderTotalIssuesContent()
        };
      case 'manual-queue':
        return {
          title: 'Manual Intervention Queue',
          description: 'Issues requiring human review and decision-making',
          content: renderManualQueueContent()
        };
      case 'performance':
        return {
          title: 'AI Performance History',
          description: 'Track AI success rate and quality improvements over time',
          content: renderPerformanceContent()
        };
      default:
        return {
          title: 'Details',
          description: '',
          content: null
        };
    }
  };

  const { title, description, content } = getDialogContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
