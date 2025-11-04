import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Link } from 'wouter';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock, 
  TrendingUp,
  ExternalLink,
  Code,
  Sparkles,
  ArrowUpRight
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
  entityDescription: string;
  metadata?: {
    fieldName?: string;
    currentValue?: any;
    expectedValue?: any;
    businessImpact?: string;
    editableFields?: string[];
    entityName?: string;
    relatedEntity?: string;
  };
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
  const [selectedIssue, setSelectedIssue] = useState<ManualQueueItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const resolveIssueMutation = useMutation({
    mutationFn: async (params: { queueId: number; action: string; notes: string; applyAiSuggestion: boolean }) => {
      return apiRequest('POST', '/api/data-quality/resolve-issue', params);
    },
    onSuccess: () => {
      // Invalidate all affected queries
      queryClient.invalidateQueries({ predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && (
          key.startsWith('/api/data-quality/manual-queue') ||
          key.startsWith('/api/data-quality/dashboard') ||
          key.startsWith('/api/data-quality/issues') ||
          key.startsWith('/api/data-quality/auto-fixed')
        );
      }});
      setSelectedIssue(null);
      setResolutionNotes('');
    }
  });

  const handleResolve = (action: 'approve' | 'reject') => {
    if (!selectedIssue) return;

    resolveIssueMutation.mutate({
      queueId: selectedIssue.id,
      action,
      notes: resolutionNotes,
      applyAiSuggestion: action === 'approve'
    });
  };

  const getEntityLink = (entityType: string, entityId: number) => {
    if (entityType === 'candidate') {
      return `/recruiting/candidates/${entityId}`;
    } else if (entityType === 'company') {
      return `/recruiting/companies/${entityId}`;
    }
    return null;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-500';
      case 'P1': return 'bg-orange-500';
      case 'P2': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

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
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/data-quality/manual-queue');
      return response as unknown as { items: ManualQueueItem[] };
    },
    enabled: isOpen && type === 'manual-queue',
    refetchInterval: 30000
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

  const EntityLink = ({ entityType, entityId }: { entityType: string; entityId: number }) => {
    const link = getEntityLink(entityType, entityId);
    if (!link) return <span>{entityType} #{entityId}</span>;
    
    return (
      <Link href={link}>
        <a
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center cursor-pointer"
          data-testid={`link-${entityType}-${entityId}`}
        >
          {entityType} #{entityId}
          <ArrowUpRight className="ml-1 h-3 w-3" />
        </a>
      </Link>
    );
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
                    <CardDescription className="mt-1 flex items-center gap-2">
                      <EntityLink entityType={fix.issue.entityType} entityId={fix.issue.entityId} />
                      <span>• Fixed in {fix.attempt.executionTimeMs}ms</span>
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
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={getSeverityColor(issue.severity)}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                        <EntityLink entityType={issue.entityType} entityId={issue.entityId} />
                        <Badge variant="secondary">{issue.status}</Badge>
                      </div>
                      
                      {/* Enhanced context display */}
                      <p className="text-sm font-medium mt-2">{issue.description}</p>
                      
                      {/* Show rich metadata if available */}
                      {issue.metadata && (
                        <div className="mt-3 space-y-2">
                          {issue.metadata.fieldName && (
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                              <span className="font-semibold text-foreground">Field:</span>
                              <span className="text-muted-foreground">{issue.metadata.fieldName}</span>
                              
                              {issue.metadata.currentValue !== undefined && (
                                <>
                                  <span className="font-semibold text-foreground">Current:</span>
                                  <span className="text-muted-foreground">
                                    {issue.metadata.currentValue === null ? '(empty)' : String(issue.metadata.currentValue)}
                                  </span>
                                </>
                              )}
                              
                              {issue.metadata.expectedValue !== undefined && (
                                <>
                                  <span className="font-semibold text-foreground">Expected:</span>
                                  <span className="text-green-600 dark:text-green-400">
                                    {String(issue.metadata.expectedValue)}
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                          
                          {issue.metadata.editableFields && issue.metadata.editableFields.length > 0 && (
                            <div className="flex items-baseline gap-2 text-xs">
                              <span className="font-semibold text-foreground">Can fix by editing:</span>
                              <div className="flex gap-1 flex-wrap">
                                {issue.metadata.editableFields.map((field) => (
                                  <Badge key={field} variant="outline" className="text-xs">
                                    {field}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {issue.metadata.businessImpact && (
                            <div className="bg-amber-50 dark:bg-amber-950 p-2 rounded text-xs">
                              <span className="font-semibold text-amber-900 dark:text-amber-100">Impact: </span>
                              <span className="text-amber-800 dark:text-amber-200">{issue.metadata.businessImpact}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {issue.suggestedFix && (
                        <p className="text-xs text-muted-foreground mt-2">
                          <span className="font-semibold">Suggested Fix:</span> {issue.suggestedFix}
                        </p>
                      )}
                      
                      {/* Quick fix button */}
                      {issue.status === 'pending' && issue.metadata?.editableFields && (
                        <Button size="sm" className="mt-3" data-testid={`button-fix-${issue.id}`} asChild>
                          <Link href={`/recruiting/${issue.entityType}s/${issue.entityId}`}>
                            Fix This Issue →
                          </Link>
                        </Button>
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
            <Card key={item.id} className="hover-elevate">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={getPriorityColor(item.priority)}>
                          {item.priority}
                        </Badge>
                        <EntityLink entityType={item.issue.entityType} entityId={item.issue.entityId} />
                        <Badge variant="secondary">{item.status}</Badge>
                      </div>
                      <p className="text-sm font-medium mt-2">{item.issue.description}</p>
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

                  <Button 
                    onClick={() => setSelectedIssue(item)}
                    size="sm"
                    data-testid={`button-resolve-${item.id}`}
                  >
                    Review & Resolve
                  </Button>
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
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>

      {/* Resolution Dialog for Manual Queue Items */}
      <Dialog open={!!selectedIssue} onOpenChange={(open) => !open && setSelectedIssue(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Issue</DialogTitle>
            <DialogDescription>
              {selectedIssue?.issue.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <h4 className="font-semibold mb-2">Issue Details</h4>
              <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entity:</span>
                  <EntityLink 
                    entityType={selectedIssue?.issue.entityType || ''} 
                    entityId={selectedIssue?.issue.entityId || 0} 
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge className={getPriorityColor(selectedIssue?.priority || '')}>
                    {selectedIssue?.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queued At:</span>
                  <span className="font-medium">
                    {new Date(selectedIssue?.createdAt || '').toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {selectedIssue?.remediationAttempt && (
              <div>
                <h4 className="font-semibold mb-2">AI Suggestions ({selectedIssue.remediationAttempt.confidenceScore}% confidence)</h4>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm space-y-2">
                  <div>
                    <span className="font-medium">Reasoning:</span>
                    <p className="mt-1">{selectedIssue.remediationAttempt.reasoning}</p>
                  </div>
                  {selectedIssue.remediationAttempt.suggestedAction && (
                    <div>
                      <span className="font-medium">Suggested Action:</span>
                      <pre className="whitespace-pre-wrap mt-1 text-xs">
                        {JSON.stringify(selectedIssue.remediationAttempt.suggestedAction, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">Resolution Notes</h4>
              <Textarea
                placeholder="Add notes about how you resolved this issue (helps AI learn)..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
                data-testid="textarea-resolution-notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSelectedIssue(null)}
              data-testid="button-cancel-resolve"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleResolve('reject')}
              disabled={resolveIssueMutation.isPending}
              data-testid="button-reject-suggestion"
            >
              Reject AI Suggestion
            </Button>
            <Button 
              onClick={() => handleResolve('approve')}
              disabled={resolveIssueMutation.isPending || !resolutionNotes}
              data-testid="button-approve-suggestion"
            >
              {resolveIssueMutation.isPending ? 'Resolving...' : 'Approve & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
