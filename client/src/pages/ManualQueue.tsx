import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { AlertCircle, Clock, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

interface QueueItem {
  queueItem: {
    id: number;
    issueId: number;
    priority: string;
    status: string;
    queuedAt: string;
    aiSuggestions: any;
    aiReasoning: string;
    slaDeadline: string;
  };
  issue: {
    id: number;
    description: string;
    suggestedFix: string;
    entityType: string;
    entityId: number;
  };
}

export default function ManualQueue() {
  const [selectedIssue, setSelectedIssue] = useState<QueueItem | null>(null);
  const [notes, setNotes] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const { data: queueData, isLoading } = useQuery<{ items: QueueItem[] }>({
    queryKey: ['/api/data-quality/manual-queue'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const resolveIssueMutation = useMutation({
    mutationFn: async (params: { queueId: number; action: string; notes: string; applyAiSuggestion: boolean }) => {
      return await apiRequest('/api/data-quality/resolve-issue', {
        method: 'POST',
        body: JSON.stringify(params)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/data-quality/manual-queue'] });
      queryClient.invalidateQueries({ queryKey: ['/api/data-quality/dashboard'] });
      setSelectedIssue(null);
      setNotes('');
    }
  });

  const handleResolve = (action: 'approve' | 'reject' | 'custom') => {
    if (!selectedIssue) return;

    resolveIssueMutation.mutate({
      queueId: selectedIssue.queueItem.id,
      action,
      notes,
      applyAiSuggestion: action === 'approve'
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'P0': return 'bg-red-500';
      case 'P1': return 'bg-orange-500';
      case 'P2': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getSLAStatus = (deadline: string) => {
    const now = new Date();
    const sla = new Date(deadline);
    const hoursRemaining = (sla.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) return { text: 'SLA Missed', color: 'text-red-600' };
    if (hoursRemaining < 2) return { text: `${Math.round(hoursRemaining * 60)} min remaining`, color: 'text-orange-600' };
    if (hoursRemaining < 24) return { text: `${Math.round(hoursRemaining)}h remaining`, color: 'text-yellow-600' };
    return { text: `${Math.round(hoursRemaining / 24)}d remaining`, color: 'text-green-600' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading queue...</p>
        </div>
      </div>
    );
  }

  const allItems = queueData?.items || [];
  const items = priorityFilter === 'all' 
    ? allItems 
    : allItems.filter(item => item.queueItem.priority === priorityFilter);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild data-testid="button-back-dashboard">
              <Link href="/admin/data-quality">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold">Manual Intervention Queue</h1>
          <p className="text-muted-foreground">Review and resolve data quality issues that require human judgment</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2" data-testid="badge-queue-count">
          {items.length} items
        </Badge>
      </div>

      {/* Priority Filter */}
      <Tabs defaultValue="all" onValueChange={setPriorityFilter}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All ({allItems.length})</TabsTrigger>
          <TabsTrigger value="P0" data-testid="tab-p0">
            Critical (P0) ({allItems.filter(i => i.queueItem.priority === 'P0').length})
          </TabsTrigger>
          <TabsTrigger value="P1" data-testid="tab-p1">
            Important (P1) ({allItems.filter(i => i.queueItem.priority === 'P1').length})
          </TabsTrigger>
          <TabsTrigger value="P2" data-testid="tab-p2">
            Enhancement (P2) ({allItems.filter(i => i.queueItem.priority === 'P2').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Queue Items */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">All clear!</h3>
            <p className="text-muted-foreground">No items in the manual intervention queue</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const slaStatus = getSLAStatus(item.queueItem.slaDeadline);
            
            return (
              <Card key={item.queueItem.id} className="hover-elevate" data-testid={`queue-item-${item.queueItem.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getPriorityColor(item.queueItem.priority)}>
                          {item.queueItem.priority}
                        </Badge>
                        <Badge variant="outline">
                          {item.issue.entityType} #{item.issue.entityId}
                        </Badge>
                        <span className={`text-sm ${slaStatus.color}`}>
                          <Clock className="inline h-3 w-3 mr-1" />
                          {slaStatus.text}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{item.issue.description}</CardTitle>
                      <CardDescription className="mt-1">
                        Queued: {new Date(item.queueItem.queuedAt).toLocaleString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {item.issue.suggestedFix && (
                      <div className="text-sm">
                        <span className="font-semibold">Suggested Fix:</span>
                        <p className="text-muted-foreground mt-1">{item.issue.suggestedFix}</p>
                      </div>
                    )}
                    
                    {item.queueItem.aiReasoning && (
                      <div className="bg-muted p-3 rounded-lg text-sm">
                        <span className="font-semibold flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          AI Analysis:
                        </span>
                        <p className="mt-1">{item.queueItem.aiReasoning}</p>
                      </div>
                    )}

                    <Button 
                      onClick={() => setSelectedIssue(item)}
                      data-testid={`button-resolve-${item.queueItem.id}`}
                    >
                      Review & Resolve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Resolution Dialog */}
      <Dialog open={!!selectedIssue} onOpenChange={() => setSelectedIssue(null)}>
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
                  <span className="font-medium">
                    {selectedIssue?.issue.entityType} #{selectedIssue?.issue.entityId}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Priority:</span>
                  <Badge className={getPriorityColor(selectedIssue?.queueItem.priority || '')}>
                    {selectedIssue?.queueItem.priority}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queued At:</span>
                  <span className="font-medium">
                    {new Date(selectedIssue?.queueItem.queuedAt || '').toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {selectedIssue?.queueItem.aiSuggestions && (
              <div>
                <h4 className="font-semibold mb-2">AI Suggestions</h4>
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg text-sm">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(selectedIssue.queueItem.aiSuggestions, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-2">Resolution Notes</h4>
              <Textarea
                placeholder="Add notes about how you resolved this issue (helps AI learn)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              disabled={resolveIssueMutation.isPending || !notes}
              data-testid="button-approve-suggestion"
            >
              {resolveIssueMutation.isPending ? 'Resolving...' : 'Approve & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
