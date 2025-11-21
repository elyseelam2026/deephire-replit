import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Briefcase } from "lucide-react";

interface JobAssignment {
  id: number;
  jobId: number;
  jobTitle: string;
  status: string;
  assignedAt: string;
}

interface CandidateJobAssignmentsTabProps {
  candidateId: number;
}

export function CandidateJobAssignmentsTab({ candidateId }: CandidateJobAssignmentsTabProps) {
  const { data: assignments, isLoading } = useQuery<JobAssignment[]>({
    queryKey: ['/api/candidates', candidateId, 'job-assignments'],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}/job-assignments`);
      if (response.status === 404) return [];
      if (!response.ok) throw new Error('Failed to fetch job assignments');
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

  if (!assignments || assignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No job assignments yet
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    'sourced': 'secondary',
    'recommended': 'default',
    'qualified': 'default',
    'interviewed': 'default',
    'offered': 'default',
    'placed': 'default',
    'rejected': 'destructive'
  };

  return (
    <div className="space-y-2" data-testid="job-assignments-tab">
      {assignments.map((assignment) => (
        <Card key={assignment.id} className="p-3 hover-elevate">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Briefcase className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{assignment.jobTitle}</p>
                <p className="text-xs text-muted-foreground">Job #{assignment.jobId}</p>
              </div>
            </div>
            <Badge variant={statusColors[assignment.status] as any} className="flex-shrink-0">
              {assignment.status}
            </Badge>
          </div>
        </Card>
      ))}
    </div>
  );
}
