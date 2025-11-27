import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { Building2, Mail, Phone, Briefcase, Star, MoreVertical, MessageSquare, Brain, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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

interface KanbanViewProps {
  jobId: number;
  candidates: JobCandidate[];
  onStatusChange?: (candidateId: number, newStatus: string) => void;
  onCandidateClick?: (candidateId: number) => void;
}

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

export default function KanbanView({ jobId, candidates, onStatusChange, onCandidateClick }: KanbanViewProps) {
  const { toast } = useToast();
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<number, string>>(new Map());

  // Use candidates from props, applying any optimistic updates
  const displayCandidates = candidates.map(c => {
    const optimisticStatus = optimisticUpdates.get(c.id);
    return optimisticStatus ? { ...c, status: optimisticStatus } : c;
  });

  // Group candidates by status
  const groupedCandidates = statusCategories.reduce((acc, category) => {
    acc[category.key] = displayCandidates.filter(c => c.status === category.key);
    return acc;
  }, {} as Record<string, JobCandidate[]>);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    setDraggingId(null);

    // Dropped outside the list
    if (!destination) return;

    // Dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const candidateId = parseInt(draggableId.split('-')[1]);
    const newStatus = destination.droppableId;

    // Optimistically update UI - add to map
    setOptimisticUpdates(prev => new Map(prev).set(candidateId, newStatus));

    try {
      // Update on server
      await apiRequest(
        'PATCH',
        `/api/job-candidates/${candidateId}/status`,
        {
          status: newStatus,
          note: `Moved to ${statusCategories.find(s => s.key === newStatus)?.label} via drag-and-drop`
        }
      );

      // Remove this candidate's optimistic update and let server data take over
      setOptimisticUpdates(prev => {
        const next = new Map(prev);
        next.delete(candidateId);
        return next;
      });

      // Invalidate cache to refresh from server
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });

      toast({
        title: "Status Updated",
        description: `Candidate moved to ${statusCategories.find(s => s.key === newStatus)?.label}`
      });

      onStatusChange?.(candidateId, newStatus);
    } catch (error) {
      // Remove optimistic update to revert to actual data
      setOptimisticUpdates(prev => {
        const next = new Map(prev);
        next.delete(candidateId);
        return next;
      });
      
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleQuickAction = async (candidateId: number, action: string) => {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;

    switch (action) {
      case 'email':
        if (candidate.candidate.email) {
          window.location.href = `mailto:${candidate.candidate.email}`;
        }
        break;
      case 'call':
        // TODO: Integrate with communication platform (Twilio, etc.)
        if (candidate.candidate.phoneNumber) {
          window.location.href = `tel:${candidate.candidate.phoneNumber}`;
          toast({
            title: "Call Ready",
            description: `Ready to call ${candidate.candidate.firstName} at ${candidate.candidate.phoneNumber}`
          });
        } else {
          toast({
            title: "No Phone Number",
            description: "This candidate doesn't have a phone number on file",
            variant: "destructive"
          });
        }
        break;
      case 'note':
        // Open note input (using existing candidate detail view)
        toast({
          title: "Add Note",
          description: "Opening candidate details where you can add notes..."
        });
        // In a full implementation, this would open a modal with note editor
        break;
      case 'reject':
        try {
          await apiRequest(
            'PATCH',
            `/api/job-candidates/${candidateId}/status`,
            {
              status: 'rejected',
              rejectedReason: 'Not a fit'
            }
          );
          queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });
          toast({
            title: "Candidate Rejected",
            description: "Status updated to rejected"
          });
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to reject candidate",
            variant: "destructive"
          });
        }
        break;
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" data-testid="kanban-view">
        {statusCategories.map(category => (
          <div key={category.key} className="flex-shrink-0 w-80">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${category.color}`} />
                <h4 className="font-semibold text-sm">{category.label}</h4>
              </div>
              <Badge variant="secondary" data-testid={`kanban-count-${category.key}`}>
                {groupedCandidates[category.key]?.length || 0}
              </Badge>
            </div>

            <Droppable droppableId={category.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-2 min-h-[400px] p-2 rounded-lg border-2 border-dashed transition-colors ${
                    snapshot.isDraggingOver ? 'border-primary bg-accent/20' : 'border-transparent'
                  }`}
                  data-testid={`kanban-column-${category.key}`}
                >
                  {groupedCandidates[category.key]?.map((jc, index) => {
                    const candidate = jc.candidate;
                    const displayName = candidate.displayName || `${candidate.firstName} ${candidate.lastName}`;

                    return (
                      <Draggable
                        key={jc.id}
                        draggableId={`candidate-${jc.id}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`hover-elevate ${snapshot.isDragging ? 'shadow-lg rotate-2' : ''}`}
                            data-testid={`kanban-card-${candidate.id}`}
                          >
                            <CardHeader className="p-3 pb-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <button
                                    onClick={() => onCandidateClick?.(candidate.id)}
                                    className="font-medium text-sm hover:underline block truncate text-left text-primary"
                                    data-testid={`kanban-link-candidate-${candidate.id}`}
                                  >
                                    {displayName}
                                  </button>
                                  {candidate.currentTitle && (
                                    <p className="text-xs text-muted-foreground truncate mt-1">
                                      {candidate.currentTitle}
                                    </p>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleQuickAction(jc.id, 'email')}>
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Email
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleQuickAction(jc.id, 'call')}>
                                      <Phone className="h-4 w-4 mr-2" />
                                      Schedule Call
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleQuickAction(jc.id, 'note')}>
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      Add Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => handleQuickAction(jc.id, 'reject')}
                                      className="text-destructive"
                                    >
                                      Reject
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0 space-y-2">
                              {(jc.currentCompany || candidate.currentCompany) && (
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Building2 className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {jc.currentCompany?.name || candidate.currentCompany}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                {jc.fitScore !== null && jc.fitScore !== undefined ? (
                                  <Badge 
                                    variant="outline" 
                                    className="text-xs flex items-center gap-1 bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-200"
                                  >
                                    <Brain className="w-3 h-3" />
                                    AI Fit: {jc.fitScore}%
                                  </Badge>
                                ) : jc.matchScore !== null ? (
                                  <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <Star className="w-3 h-3" />
                                    {jc.matchScore}%
                                  </Badge>
                                ) : null}
                                {jc.searchTier !== null && (
                                  <Badge variant="outline" className="text-xs">
                                    Tier {jc.searchTier}
                                  </Badge>
                                )}
                              </div>
                              
                              {jc.fitReasoning && (
                                <div className="rounded-md bg-muted/30 p-2 space-y-1 text-xs border border-border/30">
                                  <p className="font-medium flex items-center gap-1">
                                    <Brain className="h-3 w-3 text-primary" />
                                    Why this fits:
                                  </p>
                                  <p className="text-muted-foreground leading-relaxed line-clamp-2">
                                    {jc.fitReasoning}
                                  </p>
                                  {(jc.fitStrengths && jc.fitStrengths.length > 0) || (jc.fitConcerns && jc.fitConcerns.length > 0) ? (
                                    <div className="flex gap-2 mt-1 text-[10px]">
                                      {jc.fitStrengths && jc.fitStrengths.length > 0 && (
                                        <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                                          <CheckCircle2 className="h-2.5 w-2.5" />
                                          {jc.fitStrengths.length} strengths
                                        </span>
                                      )}
                                      {jc.fitConcerns && jc.fitConcerns.length > 0 && (
                                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                                          <AlertCircle className="h-2.5 w-2.5" />
                                          {jc.fitConcerns.length} considerations
                                        </span>
                                      )}
                                    </div>
                                  ) : null}
                                </div>
                              )}

                              {candidate.email && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Mail className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{candidate.email}</span>
                                </div>
                              )}

                              {jc.recruiterNotes && (
                                <div className="mt-2 pt-2 border-t text-xs text-muted-foreground italic">
                                  {jc.recruiterNotes}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}

                  {(!groupedCandidates[category.key] || groupedCandidates[category.key].length === 0) && (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      No candidates
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
