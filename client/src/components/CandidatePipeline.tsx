import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Building2, Mail, Phone, Briefcase, Star, Columns3, List, GanttChart, BarChart3, MapPin, Calendar, FileText, Users, ExternalLink, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import KanbanView from "./pipeline/KanbanView";
import ListView from "./pipeline/ListView";
import { TimelineView } from "./pipeline/TimelineView";
import { ConversionFunnel } from "./pipeline/ConversionFunnel";
import PipelineControls, { PipelineFilters } from "./pipeline/PipelineControls";
import { AddCandidatesModal } from "./pipeline/AddCandidatesModal";
import { BulkActionsToolbar } from "./pipeline/BulkActionsToolbar";
import { exportPipelineToCSV } from "@/lib/exportPipeline";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Candidate, CareerHistoryEntry } from "@shared/schema";

interface JobCandidate {
  id: number;
  status: string;
  statusHistory: any;
  matchScore: number | null;
  aiReasoning: any;
  searchTier: number | null;
  fitScore: number | null;
  fitReasoning: string | null;
  fitStrengths: string[] | null;
  fitConcerns: string[] | null;
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
  { key: "sourced", label: "Sourced", color: "bg-slate-500" },
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
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<number>>(new Set());
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const { toast} = useToast();
  
  const { data: job } = useQuery<{ title: string }>({
    queryKey: ['/api/jobs', jobId],
    enabled: !!jobId
  });

  const { data: candidates = [], isLoading } = useQuery<JobCandidate[]>({
    queryKey: ['/api/jobs', jobId, 'candidates'],
    enabled: !!jobId
  });

  // Fetch full candidate details when modal is opened
  const { data: selectedCandidate, isLoading: isCandidateLoading } = useQuery<Candidate>({
    queryKey: ['/api/candidates', selectedCandidateId],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${selectedCandidateId}`);
      if (!response.ok) throw new Error('Failed to fetch candidate');
      return response.json();
    },
    enabled: !!selectedCandidateId
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

  const handleBulkStatusChange = async (status: string) => {
    const jobCandidateIds = Array.from(selectedCandidateIds);
    
    const res = await fetch('/api/job-candidates/bulk/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ jobCandidateIds, status })
    });
    
    if (!res.ok) {
      throw new Error('Failed to update statuses');
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });
    setSelectedCandidateIds(new Set());
  };

  const handleBulkDelete = async () => {
    const jobCandidateIds = Array.from(selectedCandidateIds);
    
    const res = await fetch('/api/job-candidates/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ jobCandidateIds })
    });
    
    if (!res.ok) {
      throw new Error('Failed to remove candidates');
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });
    setSelectedCandidateIds(new Set());
  };

  const handleBulkAddNotes = async (notes: string) => {
    const jobCandidateIds = Array.from(selectedCandidateIds);
    
    const res = await fetch('/api/job-candidates/bulk/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ jobCandidateIds, note: notes })
    });
    
    if (!res.ok) {
      throw new Error('Failed to add notes');
    }
    
    queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });
    setSelectedCandidateIds(new Set());
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    const jobTitle = job?.title || `Job-${jobId}`;
    if (format === 'csv') {
      exportPipelineToCSV(filteredCandidates, jobTitle);
      toast({
        title: "Export successful",
        description: `Downloaded ${filteredCandidates.length} candidates as CSV`,
      });
    } else {
      // PDF export: use CSV format for now (same data, user can convert)
      exportPipelineToCSV(filteredCandidates, `${jobTitle}-PDF`);
      toast({
        title: "Export successful",
        description: `Downloaded ${filteredCandidates.length} candidates as CSV (open in Excel and save as PDF)`,
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
  const rejectedCount = candidates.filter(c => c.status === 'rejected').length;
  const activeCount = candidates.filter(c => c.status !== 'rejected').length;
  const placedCount = candidates.filter(c => c.status === 'placed').length;

  return (
    <div className="space-y-4" data-testid="candidate-pipeline">
      {/* Pipeline Statistics */}
      {totalCandidates > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Total Candidates</div>
                <div className="text-2xl font-bold">{totalCandidates}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Active</div>
                <div className="text-2xl font-bold text-blue-600">{activeCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Rejected</div>
                <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Placed</div>
                <div className="text-2xl font-bold text-green-600">{placedCount}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        onAddCandidates={() => setShowAddModal(true)}
      />

      <AddCandidatesModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        jobId={jobId}
        existingCandidateIds={candidates.map(jc => jc.candidate.id)}
      />

      <BulkActionsToolbar
        selectedCount={selectedCandidateIds.size}
        onClearSelection={() => setSelectedCandidateIds(new Set())}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkDelete={handleBulkDelete}
        onBulkAddNotes={handleBulkAddNotes}
      />

      {totalCandidates === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No candidates in pipeline yet
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <KanbanView 
          jobId={jobId} 
          candidates={filteredCandidates}
          onCandidateClick={(candidateId: number) => {
            setSelectedCandidateId(candidateId);
          }}
        />
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
          selectedIds={selectedCandidateIds}
          onToggleSelect={(id) => {
            const newSelected = new Set(selectedCandidateIds);
            if (newSelected.has(id)) {
              newSelected.delete(id);
            } else {
              newSelected.add(id);
            }
            setSelectedCandidateIds(newSelected);
          }}
          onToggleSelectAll={() => {
            if (selectedCandidateIds.size === filteredCandidates.length) {
              setSelectedCandidateIds(new Set());
            } else {
              setSelectedCandidateIds(new Set(filteredCandidates.map(jc => jc.id)));
            }
          }}
          onCandidateClick={(candidateId: number) => {
            setSelectedCandidateId(candidateId);
          }}
        />
      )}

      {/* Candidate Detail Modal */}
      <Dialog open={!!selectedCandidateId} onOpenChange={(open) => !open && setSelectedCandidateId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col" data-testid={`candidate-profile-${selectedCandidate?.id}`}>
          {isCandidateLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-sm text-muted-foreground">Loading candidate details...</p>
              </div>
            </div>
          ) : selectedCandidate ? (
            <>
              <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                <DialogTitle className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {selectedCandidate?.firstName?.[0]}{selectedCandidate?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span>
                        {`${selectedCandidate?.firstName} ${selectedCandidate?.lastName}`}
                      </span>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild data-testid="button-view-full-profile">
                    <Link href={`/recruiting/candidates/${selectedCandidate.id}`}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Full Profile
                    </Link>
                  </Button>
                </DialogTitle>
                <DialogDescription>
                  Quick preview - View full profile for detailed candidate information
                </DialogDescription>
              </DialogHeader>
              
              {selectedCandidate && (
            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 mt-2">
                <TabsTrigger value="overview" data-testid={`tab-overview-${selectedCandidate.id}`}>
                  <Users className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="career" data-testid={`tab-career-${selectedCandidate.id}`}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  Career History
                </TabsTrigger>
                <TabsTrigger value="biography" data-testid={`tab-biography-${selectedCandidate.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Executive Biography
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 py-4 space-y-6 m-0">
                <div className="grid grid-cols-2 gap-4">
                  {selectedCandidate.email && (
                    <div>
                      <h4 className="font-medium text-sm">Email</h4>
                      <p className="text-muted-foreground">{selectedCandidate.email}</p>
                    </div>
                  )}
                  {selectedCandidate.phoneNumber && (
                    <div>
                      <h4 className="font-medium text-sm">Phone</h4>
                      <p className="text-muted-foreground">{selectedCandidate.phoneNumber}</p>
                    </div>
                  )}
                  {selectedCandidate.location && (
                    <div>
                      <h4 className="font-medium text-sm">Location</h4>
                      <p className="text-muted-foreground">{selectedCandidate.location}</p>
                    </div>
                  )}
                  {selectedCandidate.currentTitle && (
                    <div>
                      <h4 className="font-medium text-sm">Current Role</h4>
                      <p className="text-muted-foreground">{selectedCandidate.currentTitle}</p>
                    </div>
                  )}
                  {selectedCandidate.currentCompany && (
                    <div>
                      <h4 className="font-medium text-sm">Current Company</h4>
                      <p className="text-muted-foreground">{selectedCandidate.currentCompany}</p>
                    </div>
                  )}
                </div>

                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedCandidate.linkedinUrl && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">LinkedIn Profile</h4>
                    <a 
                      href={selectedCandidate.linkedinUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                      data-testid={`link-linkedin-${selectedCandidate.id}`}
                    >
                      View LinkedIn Profile
                    </a>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="career" className="flex-1 overflow-y-auto px-6 py-4 space-y-6 m-0">
                {selectedCandidate.careerHistory && (selectedCandidate.careerHistory as CareerHistoryEntry[]).length > 0 ? (
                  <div className="space-y-4">
                    {(selectedCandidate.careerHistory as CareerHistoryEntry[]).map((entry, index) => (
                      <div 
                        key={index} 
                        className="border-l-2 border-primary/20 pl-4 pb-4"
                        data-testid={`career-entry-${index}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base">{entry.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <p className="text-muted-foreground">{entry.company}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {entry.startDate} - {entry.endDate || 'Present'}
                            </span>
                          </div>
                        </div>
                        {entry.location && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{entry.location}</span>
                          </div>
                        )}
                        {entry.description && (
                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-sm">No career history available yet.</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="biography" className="flex-1 overflow-y-auto px-6 py-4 space-y-6 m-0">
                <div>
                  <h4 className="font-medium text-sm mb-4">Professional Biography</h4>
                  {selectedCandidate.biography ? (
                    <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line p-4 bg-muted/50 rounded-lg" data-testid={`text-biography-${selectedCandidate.id}`}>
                      {selectedCandidate.biography}
                    </div>
                  ) : (
                    <div className="p-8 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-sm">No biography available.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
