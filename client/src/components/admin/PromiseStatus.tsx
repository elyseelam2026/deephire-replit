import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, AlertCircle, Loader2, Users, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface SearchPromise {
  id: number;
  conversationId: number;
  jobId: number | null;
  promiseText: string;
  deliveryTimeframe: string;
  deadlineAt: string;
  status: 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed';
  candidatesFound: number;
  candidateIds: number[] | null;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  searchParams: {
    title?: string;
    skills?: string[];
    location?: string;
    industry?: string;
  };
}

export function PromiseStatus() {
  const { data: promises, isLoading } = useQuery<SearchPromise[]>({
    queryKey: ['/api/search-promises'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
      case 'scheduled':
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
          label: 'Scheduled'
        };
      case 'executing':
        return {
          icon: <Loader2 className="h-4 w-4 animate-spin" />,
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
          label: 'In Progress'
        };
      case 'completed':
        return {
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
          label: 'Completed'
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
          label: 'Failed'
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100',
          label: status
        };
    }
  };

  const getTimeUntilDeadline = (deadlineAt: string) => {
    const deadline = new Date(deadlineAt);
    const now = new Date();
    const isPast = deadline < now;
    
    return {
      text: formatDistanceToNow(deadline, { addSuffix: true }),
      isPast
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">AI Search Promises</h2>
            <p className="text-muted-foreground">Track automated candidate delivery commitments</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[1, 2].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activePromises = promises?.filter(p => p.status !== 'completed' && p.status !== 'failed') || [];
  const completedPromises = promises?.filter(p => p.status === 'completed') || [];
  const failedPromises = promises?.filter(p => p.status === 'failed') || [];

  return (
    <div className="space-y-6" data-testid="promise-status">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Search Promises</h2>
          <p className="text-muted-foreground">
            Track automated candidate delivery commitments made by the AI
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm" data-testid="count-active">
            {activePromises.length} Active
          </Badge>
          <Badge variant="secondary" className="text-sm" data-testid="count-completed">
            {completedPromises.length} Completed
          </Badge>
        </div>
      </div>

      {promises?.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No promises yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                When the AI makes a delivery commitment (like "I'll send you candidates in 72 hours"), 
                it will appear here as a trackable promise.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {activePromises.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Active Promises</h3>
              {activePromises.map((promise) => {
                const statusConfig = getStatusConfig(promise.status);
                const deadline = getTimeUntilDeadline(promise.deadlineAt);

                return (
                  <Card key={promise.id} data-testid={`promise-card-${promise.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className={statusConfig.color}>
                              {statusConfig.icon}
                              <span className="ml-1.5">{statusConfig.label}</span>
                            </Badge>
                            <Badge variant="outline" className={deadline.isPast ? 'border-red-500 text-red-500' : ''}>
                              {deadline.text}
                            </Badge>
                          </div>
                          <CardTitle className="text-lg" data-testid={`promise-title-${promise.id}`}>
                            {promise.searchParams.title || 'Candidate Search'}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            "{promise.promiseText}"
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Search Parameters */}
                      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <h4 className="font-medium text-sm mb-2">Search Parameters:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {promise.searchParams.title && (
                            <div>
                              <span className="text-muted-foreground">Position:</span>{' '}
                              <span className="font-medium">{promise.searchParams.title}</span>
                            </div>
                          )}
                          {promise.searchParams.location && (
                            <div>
                              <span className="text-muted-foreground">Location:</span>{' '}
                              <span className="font-medium">{promise.searchParams.location}</span>
                            </div>
                          )}
                          {promise.searchParams.industry && (
                            <div>
                              <span className="text-muted-foreground">Industry:</span>{' '}
                              <span className="font-medium">{promise.searchParams.industry}</span>
                            </div>
                          )}
                          {promise.searchParams.skills && promise.searchParams.skills.length > 0 && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Skills:</span>{' '}
                              <span className="font-medium">{promise.searchParams.skills.join(', ')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Progress */}
                      {promise.status === 'executing' && (
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI is searching for candidates right now...</span>
                        </div>
                      )}

                      {promise.candidatesFound > 0 && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <Users className="h-4 w-4" />
                          <span>{promise.candidatesFound} candidates found</span>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                        <span>Created {formatDistanceToNow(new Date(promise.createdAt), { addSuffix: true })}</span>
                        <span>Conversation #{promise.conversationId}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {completedPromises.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Completed Promises</h3>
              {completedPromises.slice(0, 5).map((promise) => {
                const statusConfig = getStatusConfig(promise.status);

                return (
                  <Card key={promise.id} className="opacity-75" data-testid={`promise-card-${promise.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className={statusConfig.color}>
                              {statusConfig.icon}
                              <span className="ml-1.5">{statusConfig.label}</span>
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">
                            {promise.searchParams.title || 'Candidate Search'}
                          </CardTitle>
                          <CardDescription>
                            Delivered {promise.candidatesFound} candidates
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Completed {formatDistanceToNow(new Date(promise.completedAt!), { addSuffix: true })}</span>
                        {promise.jobId && (
                          <Button variant="ghost" size="sm" className="h-auto p-0 text-xs">
                            View Job #{promise.jobId}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {failedPromises.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Failed Promises</h3>
              {failedPromises.map((promise) => {
                const statusConfig = getStatusConfig(promise.status);

                return (
                  <Card key={promise.id} className="border-red-200 dark:border-red-900" data-testid={`promise-card-${promise.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className={statusConfig.color}>
                              {statusConfig.icon}
                              <span className="ml-1.5">{statusConfig.label}</span>
                            </Badge>
                          </div>
                          <CardTitle className="text-lg">
                            {promise.searchParams.title || 'Candidate Search'}
                          </CardTitle>
                          <CardDescription className="text-red-600 dark:text-red-400">
                            {promise.errorMessage || 'Search failed'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
