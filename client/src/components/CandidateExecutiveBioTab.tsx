import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Loader2, Award, Trophy, Lightbulb } from "lucide-react";

interface ExecutiveBio {
  summary?: string;
  keyAchievements?: string[];
  strengths?: string[];
  leadershipStyle?: string;
  industryExpertise?: string[];
}

interface CandidateExecutiveBioTabProps {
  candidateId: number;
}

export function CandidateExecutiveBioTab({ candidateId }: CandidateExecutiveBioTabProps) {
  const { data: bio, isLoading } = useQuery<ExecutiveBio>({
    queryKey: ['/api/candidates', candidateId, 'executive-biography'],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}/executive-biography`);
      if (response.status === 404) return {};
      if (!response.ok) throw new Error('Failed to fetch biography');
      return response.json();
    },
    staleTime: 1000 * 60 * 5
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!bio || Object.keys(bio).length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No executive biography available yet
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="executive-bio-tab">
      {bio.summary && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Executive Summary</h3>
          <p className="text-sm text-foreground whitespace-pre-wrap">{bio.summary}</p>
        </Card>
      )}

      {bio.leadershipStyle && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm mb-1">Leadership Style</h3>
              <p className="text-sm text-foreground">{bio.leadershipStyle}</p>
            </div>
          </div>
        </Card>
      )}

      {bio.keyAchievements && bio.keyAchievements.length > 0 && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Trophy className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-2">Key Achievements</h3>
              <ul className="space-y-1">
                {bio.keyAchievements.map((achievement, idx) => (
                  <li key={idx} className="text-sm text-foreground flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{achievement}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {bio.strengths && bio.strengths.length > 0 && (
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <Award className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-2">Core Strengths</h3>
              <ul className="space-y-1">
                {bio.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-foreground flex gap-2">
                    <span className="text-primary">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {bio.industryExpertise && bio.industryExpertise.length > 0 && (
        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2">Industry Expertise</h3>
          <div className="flex flex-wrap gap-2">
            {bio.industryExpertise.map((industry, idx) => (
              <div
                key={idx}
                className="px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium"
              >
                {industry}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
