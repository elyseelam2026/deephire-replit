import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Building2, Mail, Phone, Briefcase, Star, Columns3, List, GanttChart, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import KanbanView from "./pipeline/KanbanView";
import ListView from "./pipeline/ListView";
import { TimelineView } from "./pipeline/TimelineView";
import { ConversionFunnel } from "./pipeline/ConversionFunnel";
import PipelineControls, { PipelineFilters } from "./pipeline/PipelineControls";
import { exportPipelineToCSV } from "@/lib/exportPipeline";

interface JobCandidate {
  id: number;
  status: string;
  statusHistory: any;
  matchScore: number | null;
  aiReasoning: any;
  searchTier: number | null;
  recruiterNotes: string | null;
  rejectedReason: string | null;
  lastActionAt: string | null;
  aiSuggestion: any;
  addedAt: string;
  statusChangedAt: string;
  candidate: {
    id: number;
    firstName: string;
    lastName: string;
    displayName: string | null;
    currentTitle: string | null;
    currentCompany: string | null;
    email: string | null;
    phoneNumber: string | null;
    location: string | null;
  };
  currentCompany: {
    id: number;
    name: string;
    industry: string | null;
    location: string | null;
  } | null;
}

interface CandidatePipelineProps {
  jobId: number;
}

type ViewMode = 'list' | 'kanban' | 'timeline' | 'analytics';

const statusCategories = [
  { key: "recommended", label: "Recommended", color: "bg-blue-500" },
  { key: "reviewed", label: "Reviewed", color: "bg-purple-500" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-yellow-500" },
  { key: "presented", label: "Presented", color: "bg-orange-500" },
  { key: "interview", label: "Interview", color: "bg-cyan-500" },
  { key: "offer", label: "Offer", color: "bg-green-500" },
  { key: "placed", label: "Placed", color: "bg-emerald-600" },
  { key: "rejected", label: "Rejected", color: "bg-red-500" }
];

export default function CandidatePipeline({ jobId }: CandidatePipelineProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<PipelineFilters>({});
  const { toast } = useToast();
  
  const { data: job } = useQuery<{ title: string }>({
    queryKey: ['/api/jobs', jobId],
    enabled: !!jobId
  });

  const { data: candidates = [], isLoading } = useQuery<JobCandidate[]>({
    queryKey: ['/api/jobs', jobId, 'candidates'],
    enabled: !!jobId
  });

  // Filter candidates based on search and filters
  const filteredCandidates = useMemo(() => {
    return candidates.filter(jc => {
      const candidate = jc.candidate;
      const displayName = candidate.displayName || `${candidate.firstName} ${candidate.lastName}`;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          displayName,
          candidate.currentTitle,
          candidate.currentCompany,
          jc.currentCompany?.name,
          candidate.email,
        ].filter(Boolean).join(' ').toLowerCase();
        
        if (!searchableText.includes(query)) {
          return false;
        }
      }
      
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(jc.status)) {
          return false;
        }
      }
      
      // Score filter - exclude candidates with null scores when filter is active
      if (filters.minScore !== undefined) {
        if (jc.matchScore === null || jc.matchScore < filters.minScore) {
          return false;
        }
      }
      
      // Tier filter - exclude candidates with null tiers when filter is active
      if (filters.searchTier && filters.searchTier.length > 0) {
        if (jc.searchTier === null || !filters.searchTier.includes(jc.searchTier)) {
          return false;
        }
      }
      
      return true;
    });
  }, [candidates, searchQuery, filters]);

  const handleExport = (format: 'csv' | 'pdf') => {
    if (format === 'csv') {
      const jobTitle = job?.title || `Job-${jobId}`;
      exportPipelineToCSV(filteredCandidates, jobTitle);
      toast({
        title: "Export successful",
        description: `Downloaded ${filteredCandidates.length} candidates as CSV`,
      });
    } else {
      toast({
        title: "PDF Export",
        description: "PDF export coming soon",
        variant: "default",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading pipeline...
      </div>
    );
  }

  // Group candidates by status
  const groupedCandidates = statusCategories.map(category => ({
    ...category,
    candidates: filteredCandidates.filter(c => c.status === category.key)
  }));

  const totalCandidates = candidates.length;

  return (
    <div className="space-y-4" data-testid="candidate-pipeline">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Candidate Pipeline</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4 mr-2" />
            List
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            data-testid="button-view-kanban"
          >
            <Columns3 className="h-4 w-4 mr-2" />
            Kanban
          </Button>
          <Button
            variant={viewMode === 'timeline' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('timeline')}
            data-testid="button-view-timeline"
          >
            <GanttChart className="h-4 w-4 mr-2" />
            Timeline
          </Button>
          <Button
            variant={viewMode === 'analytics' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('analytics')}
            data-testid="button-view-analytics"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>
      </div>

      <PipelineControls
        totalCount={totalCandidates}
        filteredCount={filteredCandidates.length}
        searchQuery={searchQuery}
        filters={filters}
        onSearch={setSearchQuery}
        onFilterChange={setFilters}
        onExport={handleExport}
      />

      {totalCandidates === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No candidates in pipeline yet
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <KanbanView jobId={jobId} candidates={filteredCandidates} />
      ) : viewMode === 'timeline' ? (
        <TimelineView 
          jobId={jobId} 
          candidates={filteredCandidates.map(jc => ({
            ...jc,
            jobId: jobId,
            candidateId: jc.candidate.id,
            createdAt: jc.addedAt
          }))} 
        />
      ) : viewMode === 'analytics' ? (
        <ConversionFunnel 
          jobId={jobId} 
          candidates={filteredCandidates.map(jc => ({
            ...jc,
            jobId: jobId,
            candidateId: jc.candidate.id,
            createdAt: jc.addedAt
          }))} 
        />
      ) : (
        <ListView 
          jobId={jobId} 
          candidates={filteredCandidates.map(jc => ({
            ...jc,
            jobId: jobId,
            candidateId: jc.candidate.id,
            createdAt: jc.addedAt
          }))} 
        />
      )}
    </div>
  );
}
