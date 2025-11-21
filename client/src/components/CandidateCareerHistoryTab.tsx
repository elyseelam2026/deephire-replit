import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase, Calendar, MapPin } from "lucide-react";

interface CareerEntry {
  id: number;
  company: string;
  jobTitle: string;
  location?: string;
  startDate: string;
  endDate?: string;
  description?: string;
  isCurrent: boolean;
}

interface CandidateCareerHistoryTabProps {
  candidateId: number;
}

export function CandidateCareerHistoryTab({ candidateId }: CandidateCareerHistoryTabProps) {
  const { data: careerHistory, isLoading } = useQuery<CareerEntry[]>({
    queryKey: ['/api/candidates', candidateId, 'career-history'],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}/career-history`);
      if (response.status === 404) return [];
      if (!response.ok) throw new Error('Failed to fetch career history');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!careerHistory || careerHistory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No career history available yet
      </div>
    );
  }

  const formatDate = (date: string) => {
    try {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return date;
    }
  };

  return (
    <div className="space-y-3" data-testid="career-history-tab">
      {careerHistory.map((entry, idx) => (
        <Card key={entry.id} className="p-4 relative">
          {idx !== careerHistory.length - 1 && (
            <div className="absolute left-8 top-16 w-0.5 h-12 bg-border" />
          )}
          
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                <Briefcase className="h-3 w-3 text-primary" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <h3 className="font-semibold text-sm">{entry.jobTitle}</h3>
                  <p className="text-sm text-muted-foreground">{entry.company}</p>
                </div>
                {entry.isCurrent && (
                  <Badge className="flex-shrink-0">Current</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-2">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(entry.startDate)} - {entry.endDate ? formatDate(entry.endDate) : 'Present'}
                </div>
                {entry.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {entry.location}
                  </div>
                )}
              </div>

              {entry.description && (
                <p className="text-sm text-foreground whitespace-pre-wrap">{entry.description}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
