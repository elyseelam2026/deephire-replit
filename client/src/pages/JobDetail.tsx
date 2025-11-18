import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, TrendingUp } from "lucide-react";
import { Job } from "@shared/schema";
import { Link } from "wouter";
import CandidatePipeline from "@/components/CandidatePipeline";
import { SearchPyramid } from "@/components/SearchPyramid";
import { DepthControl } from "@/components/DepthControl";
import { CollapsibleJobInfo } from "@/components/CollapsibleJobInfo";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function JobDetail() {
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Support both /recruiting/jobs/:id and /client/jobs/:id
  const [, recruitingParams] = useRoute("/recruiting/jobs/:id");
  const [, clientParams] = useRoute("/client/jobs/:id");
  const params = recruitingParams || clientParams;
  
  const jobId = params?.id ? parseInt(params.id) : null;
  const isClientPortal = location.startsWith('/client');

  // Fetch job data
  const { data: job, isLoading } = useQuery<Job>({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch job');
      }
      return response.json();
    },
    enabled: !!jobId,
    refetchInterval: (query) => {
      // Poll every 30 seconds if autonomous search is running
      const job = query?.state?.data as Job | undefined;
      const searchConfig = job?.searchDepthConfig as any;
      if (searchConfig?.isRunning) {
        return 30000; // 30 seconds
      }
      return false;
    }
  });

  // Fetch job candidates for pyramid
  const { data: jobCandidates = [] } = useQuery<any[]>({
    queryKey: ['/api/jobs', jobId, 'candidates'],
    queryFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}/candidates`);
      if (!response.ok) {
        throw new Error('Failed to fetch candidates');
      }
      return response.json();
    },
    enabled: !!jobId,
    refetchInterval: job?.searchDepthConfig?.isRunning ? 30000 : false
  });

  // Mutation to update search depth
  const updateSearchDepthMutation = useMutation({
    mutationFn: async (newTarget: '8_elite' | '20_standard' | '50_at_60' | '100_plus') => {
      const response = await fetch(`/api/jobs/${jobId}/search-depth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: newTarget })
      });
      if (!response.ok) throw new Error('Failed to update search depth');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
      toast({
        title: "Search depth updated",
        description: "AI will continue searching until target is reached"
      });
    },
    onError: () => {
      toast({
        title: "Failed to update search depth",
        variant: "destructive"
      });
    }
  });

  // Check if search target is met and auto-stop
  useEffect(() => {
    if (!job || !jobCandidates || !job.searchDepthConfig) return;
    
    const config = job.searchDepthConfig as any;
    if (!config.isRunning) return;

    const target = config.target;
    let targetMet = false;
    
    if (target === '8_elite') {
      targetMet = jobCandidates.filter((c: any) => (c.hardSkillScore ?? 0) >= 85).length >= 8;
    } else if (target === '20_standard') {
      targetMet = jobCandidates.filter((c: any) => (c.hardSkillScore ?? 0) >= 75).length >= 20;
    } else if (target === '50_at_60') {
      targetMet = jobCandidates.filter((c: any) => (c.hardSkillScore ?? 0) >= 60).length >= 50;
    } else if (target === '100_plus') {
      targetMet = jobCandidates.length >= 100;
    }

    if (targetMet) {
      // Auto-stop search
      fetch(`/api/jobs/${jobId}/search-depth`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, isRunning: false })
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId] });
        toast({
          title: "Search complete! 🎯",
          description: `Found ${jobCandidates.length} candidates. Market coverage: ${config.marketCoverage || 0}%`
        });
      });
    }
  }, [job, jobCandidates, jobId, toast]);

  if (isLoading || !job) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const searchConfig = (job.searchDepthConfig || {
    target: '50_at_60',
    isRunning: false,
    marketCoverage: 0,
    estimatedMarketSize: 200
  }) as any;

  return (
    <div className="h-full flex flex-col" data-testid="job-detail-page">
      {/* Header - War Room Status Bar */}
      <div className="border-b bg-card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Link href={isClientPortal ? "/client/jobs" : "/recruiting/jobs"}>
                <Button variant="ghost" size="sm" data-testid="button-back-to-jobs">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold mb-1" data-testid="job-title">{job.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Client: {job.companyId ? `Company #${job.companyId}` : 'Undisclosed'}</span>
              <span>•</span>
              <span>Fee: ${(job.estimatedPlacementFee || 0).toLocaleString()}</span>
              <span>•</span>
              <span>Target: {job.turnaroundLevel === 'express' ? '6 hours' : '12 hours'}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Market Coverage */}
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">Market Coverage</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold text-primary">{searchConfig.marketCoverage || 0}</span>
                <span className="text-xl text-muted-foreground">%</span>
              </div>
            </div>

            {/* Status Badge */}
            <Badge 
              variant={searchConfig.isRunning ? "default" : "secondary"}
              className={`px-4 py-2 text-sm font-medium ${searchConfig.isRunning ? 'bg-green-600' : 'bg-gray-600'}`}
              data-testid="badge-search-status"
            >
              {searchConfig.isRunning ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executing
                </span>
              ) : (
                'Complete'
              )}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content - Pyramid + Pipeline */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="grid grid-cols-12 gap-6 h-full">
          {/* Left: Search Pyramid (4 cols) + Depth Control */}
          <div className="col-span-4 space-y-4 overflow-y-auto">
            <SearchPyramid candidates={jobCandidates} />
            <DepthControl 
              current={searchConfig.target} 
              isRunning={searchConfig.isRunning}
              onChange={(newTarget) => updateSearchDepthMutation.mutate(newTarget)}
            />
          </div>

          {/* Right: Pipeline Kanban (8 cols) */}
          <div className="col-span-8 overflow-y-auto" data-testid="panel-pipeline">
            <CandidatePipeline jobId={jobId!} />
          </div>
        </div>
      </div>

      {/* Bottom: Collapsible Job Info */}
      <div className="border-t p-6">
        <CollapsibleJobInfo job={job} />
      </div>
    </div>
  );
}
