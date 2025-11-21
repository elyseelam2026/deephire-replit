import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, Check } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ATSPipelineStatusProps {
  jobId: number;
  candidateId: number;
  currentStatus: string;
}

const stages = [
  { key: "sourced", label: "Sourced", color: "bg-slate-100 dark:bg-slate-800" },
  { key: "recommended", label: "Recommended", color: "bg-blue-100 dark:bg-blue-800" },
  { key: "reviewed", label: "Reviewed", color: "bg-purple-100 dark:bg-purple-800" },
  { key: "shortlisted", label: "Shortlisted", color: "bg-yellow-100 dark:bg-yellow-800" },
  { key: "presented", label: "Presented", color: "bg-orange-100 dark:bg-orange-800" },
  { key: "interview", label: "Interview", color: "bg-cyan-100 dark:bg-cyan-800" },
  { key: "offer", label: "Offer", color: "bg-green-100 dark:bg-green-800" },
  { key: "placed", label: "Placed", color: "bg-emerald-600 dark:bg-emerald-700" }
];

export function ATSPipelineStatus({ jobId, candidateId, currentStatus }: ATSPipelineStatusProps) {
  const { toast } = useToast();
  const currentIndex = stages.findIndex(s => s.key === currentStatus) || 0;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await fetch(`/api/job-candidates/${candidateId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: `Candidate moved to ${stages.find(s => s.key === currentStatus)?.label}`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  });

  return (
    <Card className="p-4">
      <div className="mb-3">
        <h3 className="font-semibold text-sm mb-2">8-Stage ATS Pipeline</h3>
        <Badge>{currentStatus}</Badge>
      </div>

      {/* Pipeline Stages */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {stages.map((stage, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={stage.key} className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                size="sm"
                onClick={() => updateStatusMutation.mutate(stage.key)}
                disabled={updateStatusMutation.isPending}
                className="whitespace-nowrap min-w-fit"
                data-testid={`button-stage-${stage.key}`}
              >
                {isCompleted && <Check className="h-3 w-3 mr-1" />}
                {stage.label}
              </Button>
              {index < stages.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Bar */}
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${((currentIndex + 1) / stages.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1}/{stages.length}
        </span>
      </div>
    </Card>
  );
}
