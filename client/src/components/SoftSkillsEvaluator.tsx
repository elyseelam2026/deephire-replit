import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { Save, RotateCcw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface SoftSkillsEvaluatorProps {
  jobId: number;
  candidateId: number;
  currentSoftSkillScore?: number;
  currentReasoning?: string;
}

const softSkillDimensions = [
  { key: "leadership", label: "Leadership", description: "Ability to guide and inspire teams" },
  { key: "communication", label: "Communication", description: "Clarity and persuasiveness" },
  { key: "problemSolving", label: "Problem Solving", description: "Creative thinking and adaptability" },
  { key: "teamwork", label: "Teamwork", description: "Collaboration and cross-functional work" },
  { key: "resilience", label: "Resilience", description: "Handling pressure and setbacks" },
];

export function SoftSkillsEvaluator({
  jobId,
  candidateId,
  currentSoftSkillScore = 0,
  currentReasoning = ""
}: SoftSkillsEvaluatorProps) {
  const [scores, setScores] = useState<Record<string, number>>({
    leadership: 0,
    communication: 0,
    problemSolving: 0,
    teamwork: 0,
    resilience: 0
  });
  const [reasoning, setReasoning] = useState(currentReasoning);
  const { toast } = useToast();

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0) / 5; // Average of 5 dimensions = 0-30 scale

  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/jobs/${jobId}/candidates/${candidateId}/soft-skills`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          softSkillScore: Math.round(totalScore * 0.6), // Convert to 0-30 scale
          softSkillDimensions: scores,
          evaluationReasoning: reasoning
        })
      });
      if (!response.ok) throw new Error('Failed to save soft skills');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Soft skills saved",
        description: `Score: ${Math.round(totalScore * 0.6)}/30`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/jobs', jobId, 'candidates'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save soft skills",
        variant: "destructive"
      });
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Soft Skills Evaluation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dimension Sliders */}
        <div className="space-y-4">
          {softSkillDimensions.map(dim => (
            <div key={dim.key} data-testid={`soft-skill-${dim.key}`}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <label className="font-medium text-sm">{dim.label}</label>
                  <p className="text-xs text-muted-foreground">{dim.description}</p>
                </div>
                <Badge variant="secondary">{scores[dim.key]}/6</Badge>
              </div>
              <Slider
                value={[scores[dim.key]]}
                onValueChange={(value) =>
                  setScores(s => ({ ...s, [dim.key]: value[0] }))
                }
                min={0}
                max={6}
                step={1}
                className="cursor-pointer"
                data-testid={`slider-${dim.key}`}
              />
            </div>
          ))}
        </div>

        {/* Overall Score */}
        <div className="bg-card border-2 border-primary rounded-lg p-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Soft Skills Score</div>
            <div className="text-4xl font-bold text-primary mb-1">
              {Math.round(totalScore * 0.6)}/30
            </div>
            <div className="text-xs text-muted-foreground">
              Contributes to final fit score (combined with hard skills)
            </div>
          </div>
        </div>

        {/* Reasoning */}
        <div>
          <label className="text-sm font-medium mb-2 block">Evaluation Notes</label>
          <Textarea
            placeholder="Document your assessment of this candidate's soft skills, work style, and cultural fit..."
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            className="min-h-24 text-sm"
            data-testid="textarea-soft-skills-reasoning"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setScores({
                leadership: 0,
                communication: 0,
                problemSolving: 0,
                teamwork: 0,
                resilience: 0
              });
              setReasoning("");
            }}
            data-testid="button-reset-soft-skills"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            data-testid="button-save-soft-skills"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Evaluation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
