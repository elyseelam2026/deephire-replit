import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Building2, Mail, Phone, Briefcase, Star, Columns3, List } from "lucide-react";
import KanbanView from "./pipeline/KanbanView";

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

type ViewMode = 'list' | 'kanban';

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
  
  const { data: candidates = [], isLoading } = useQuery<JobCandidate[]>({
    queryKey: ['/api/jobs', jobId, 'candidates'],
    enabled: !!jobId
  });

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
    candidates: candidates.filter(c => c.status === category.key)
  }));

  const totalCandidates = candidates.length;

  return (
    <div className="space-y-4" data-testid="candidate-pipeline">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Candidate Pipeline</h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
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
          </div>
          <Badge variant="outline" data-testid="total-candidates">
            {totalCandidates} Total
          </Badge>
        </div>
      </div>

      {totalCandidates === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No candidates in pipeline yet
          </CardContent>
        </Card>
      ) : viewMode === 'kanban' ? (
        <KanbanView jobId={jobId} candidates={candidates} />
      ) : (
        <div className="space-y-4">
          {groupedCandidates.map(category => category.candidates.length > 0 && (
            <Card key={category.key} data-testid={`pipeline-stage-${category.key}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${category.color}`} />
                    {category.label}
                  </CardTitle>
                  <Badge variant="secondary" data-testid={`count-${category.key}`}>
                    {category.candidates.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {category.candidates.map(jc => {
                  const candidate = jc.candidate;
                  const displayName = candidate.displayName || `${candidate.firstName} ${candidate.lastName}`;
                  
                  return (
                    <div
                      key={jc.id}
                      className="p-3 rounded-md border hover-elevate active-elevate-2"
                      data-testid={`candidate-card-${candidate.id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              href={`/recruiting/candidates/${candidate.id}`}
                              className="font-medium text-primary hover:underline"
                              data-testid={`link-candidate-${candidate.id}`}
                            >
                              {displayName}
                            </Link>
                            {jc.matchScore !== null && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Star className="w-3 h-3" />
                                {jc.matchScore}%
                              </Badge>
                            )}
                          </div>
                          
                          {candidate.currentTitle && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>{candidate.currentTitle}</span>
                            </div>
                          )}
                          
                          {(jc.currentCompany || candidate.currentCompany) && (
                            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {jc.currentCompany ? (
                                <Link
                                  href={`/recruiting/companies/${jc.currentCompany.id}`}
                                  className="text-primary hover:underline"
                                  data-testid={`link-company-${jc.currentCompany.id}`}
                                >
                                  {jc.currentCompany.name}
                                </Link>
                              ) : (
                                <span>{candidate.currentCompany}</span>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                            {candidate.email && (
                              <div className="flex items-center gap-1" data-testid={`candidate-${candidate.id}-email`}>
                                <Mail className="w-3 h-3" />
                                <span className="truncate max-w-[200px]">{candidate.email}</span>
                              </div>
                            )}
                            {candidate.phoneNumber && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                <span>{candidate.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {jc.searchTier !== null && (
                          <Badge variant="outline" className="text-xs">
                            Tier {jc.searchTier}
                          </Badge>
                        )}
                      </div>
                      
                      {jc.recruiterNotes && (
                        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                          <span className="font-medium">Notes:</span> {jc.recruiterNotes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
