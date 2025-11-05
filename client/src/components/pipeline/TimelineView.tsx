import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Clock, Calendar, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  currentTitle?: string | null;
  currentCompany?: string | null;
  email?: string | null;
  location?: string | null;
  yearsExperience?: number | null;
}

interface JobCandidate {
  id: number;
  jobId: number;
  candidateId: number;
  matchScore: number | null;
  searchTier: number | null;
  status: string;
  statusHistory?: Array<{ status: string; timestamp: string }> | null;
  createdAt: string;
  candidate: Candidate;
}

interface TimelineViewProps {
  candidates: JobCandidate[];
  jobId: number;
}

const PIPELINE_STAGES = [
  { key: 'recommended', label: 'Recommended', color: 'bg-blue-500' },
  { key: 'reviewed', label: 'Reviewed', color: 'bg-purple-500' },
  { key: 'shortlisted', label: 'Shortlisted', color: 'bg-yellow-500' },
  { key: 'presented', label: 'Presented', color: 'bg-orange-500' },
  { key: 'interview', label: 'Interview', color: 'bg-cyan-500' },
  { key: 'offer', label: 'Offer', color: 'bg-green-500' },
  { key: 'placed', label: 'Placed', color: 'bg-emerald-600' },
  { key: 'rejected', label: 'Rejected', color: 'bg-red-500' },
];

function getStatusIndex(status: string): number {
  return PIPELINE_STAGES.findIndex(s => s.key === status);
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function calculateTimeInStage(jobCandidate: JobCandidate): string {
  try {
    const statusHistory = jobCandidate.statusHistory || [];
    
    if (statusHistory.length === 0) {
      const createdDate = new Date(jobCandidate.createdAt);
      if (isNaN(createdDate.getTime())) {
        return 'Recently added';
      }
      return formatDistanceToNow(createdDate, { addSuffix: false });
    }
    
    const lastChange = statusHistory[statusHistory.length - 1];
    if (!lastChange || !lastChange.timestamp) {
      const createdDate = new Date(jobCandidate.createdAt);
      if (isNaN(createdDate.getTime())) {
        return 'Recently added';
      }
      return formatDistanceToNow(createdDate, { addSuffix: false });
    }
    
    const lastChangeDate = new Date(lastChange.timestamp);
    if (isNaN(lastChangeDate.getTime())) {
      const createdDate = new Date(jobCandidate.createdAt);
      if (isNaN(createdDate.getTime())) {
        return 'Recently added';
      }
      return formatDistanceToNow(createdDate, { addSuffix: false });
    }
    
    return formatDistanceToNow(lastChangeDate, { addSuffix: false });
  } catch (error) {
    return 'Recently added';
  }
}

function getProgressPercentage(status: string): number {
  const index = getStatusIndex(status);
  if (index === -1) return 0;
  return ((index + 1) / PIPELINE_STAGES.length) * 100;
}

export function TimelineView({ candidates, jobId }: TimelineViewProps) {
  return (
    <div className="space-y-4" data-testid="timeline-view">
      {/* Timeline Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Candidate Journey Timeline</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>Showing {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Stage Headers */}
        <div className="grid grid-cols-8 gap-2 mb-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.key} className="text-center">
              <div className="text-xs font-medium mb-1">{stage.label}</div>
              <div className={`h-1 ${stage.color} rounded`}></div>
            </div>
          ))}
        </div>
      </Card>

      {/* Candidate Timelines */}
      <div className="space-y-3">
        {candidates.map((jobCandidate) => {
          const candidate = jobCandidate.candidate;
          const fullName = `${candidate.firstName} ${candidate.lastName}`;
          const currentStageIndex = getStatusIndex(jobCandidate.status);
          const progressPercent = getProgressPercentage(jobCandidate.status);
          const timeInStage = calculateTimeInStage(jobCandidate);

          return (
            <Card 
              key={jobCandidate.id} 
              className="p-4 hover-elevate"
              data-testid={`timeline-row-${jobCandidate.id}`}
            >
              <div className="flex items-center gap-4">
                {/* Candidate Info */}
                <div className="flex items-center gap-3 w-64 flex-shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={undefined} />
                    <AvatarFallback className="text-xs">
                      {getInitials(candidate.firstName, candidate.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{fullName}</div>
                    {candidate.currentTitle && (
                      <div className="text-xs text-muted-foreground truncate">
                        {candidate.currentTitle}
                      </div>
                    )}
                    {candidate.currentCompany && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground truncate">
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{candidate.currentCompany}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="flex-1 relative">
                  {/* Background Track */}
                  <div className="h-8 bg-muted rounded-full overflow-hidden">
                    {/* Progress Bar */}
                    <div 
                      className={`h-full ${PIPELINE_STAGES[currentStageIndex]?.color || 'bg-gray-400'} transition-all duration-500`}
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>

                  {/* Stage Markers */}
                  <div className="absolute inset-0 flex items-center justify-between px-1">
                    {PIPELINE_STAGES.map((stage, index) => {
                      const isPassed = index < currentStageIndex;
                      const isCurrent = index === currentStageIndex;
                      const isFuture = index > currentStageIndex;

                      return (
                        <div 
                          key={stage.key}
                          className="flex items-center justify-center"
                          style={{ width: `${100 / PIPELINE_STAGES.length}%` }}
                        >
                          <div 
                            className={`h-4 w-4 rounded-full border-2 transition-all ${
                              isCurrent 
                                ? `${stage.color} border-white scale-125 shadow-lg` 
                                : isPassed
                                ? 'bg-white border-white'
                                : 'bg-muted border-muted-foreground/30'
                            }`}
                            title={stage.label}
                          ></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 w-48 flex-shrink-0">
                  {/* Current Status */}
                  <div className="flex-1">
                    <Badge variant="outline" className="text-xs w-full justify-center">
                      {PIPELINE_STAGES[currentStageIndex]?.label || jobCandidate.status}
                    </Badge>
                    <div className="text-xs text-muted-foreground text-center mt-1 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      {timeInStage}
                    </div>
                  </div>

                  {/* Match Score */}
                  {jobCandidate.matchScore != null && (
                    <div className="text-center">
                      <Badge 
                        variant={jobCandidate.matchScore >= 80 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {jobCandidate.matchScore}%
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* Status History (if available) */}
              {jobCandidate.statusHistory && jobCandidate.statusHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="font-medium">Journey:</span>
                    {jobCandidate.statusHistory.map((entry, index) => (
                      <span key={index}>
                        {entry.status}
                        {index < jobCandidate.statusHistory!.length - 1 && ' → '}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {candidates.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p className="text-sm">No candidates in pipeline</p>
          </div>
        </Card>
      )}
    </div>
  );
}
