import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink, MapPin, Briefcase, TrendingUp, Search, Eye } from "lucide-react";
import { Link } from "wouter";
import { CandidateDetailModal } from "./CandidateDetailModal";

interface Candidate {
  id: number;
  firstName: string;
  lastName: string;
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  skills: string[] | null;
}

interface JobCandidate {
  id: number;
  candidate: Candidate;
  fitScore: number | null;
  hardSkillScore: number | null;
  softSkillScore: number | null;
  status: string;
  addedAt: string;
}

interface CandidateLonglistProps {
  jobId: number;
}

const getScoreColor = (score: number | null) => {
  if (!score) return "text-muted-foreground";
  if (score >= 85) return "text-green-600 dark:text-green-400 font-bold";
  if (score >= 76) return "text-blue-600 dark:text-blue-400 font-bold";
  if (score >= 66) return "text-yellow-600 dark:text-yellow-400 font-bold";
  if (score >= 60) return "text-orange-600 dark:text-orange-400 font-bold";
  return "text-red-600 dark:text-red-400";
};

const getScoreBadgeVariant = (score: number | null) => {
  if (!score) return "secondary";
  if (score >= 85) return "default";
  if (score >= 76) return "default";
  if (score >= 60) return "secondary";
  return "destructive";
};

export default function CandidateLonglist({ jobId }: CandidateLonglistProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"fit" | "hardSkill" | "recent">("fit");
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: candidates = [], isLoading } = useQuery<JobCandidate[]>({
    queryKey: ['/api/jobs', jobId, 'candidates'],
    enabled: !!jobId,
    refetchInterval: 10000
  });

  const filtered = candidates
    .filter(jc => {
      if (!search) return true;
      const text = `${jc.candidate.firstName} ${jc.candidate.lastName} ${jc.candidate.currentTitle || ''} ${jc.candidate.currentCompany || ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "fit") return (b.fitScore ?? 0) - (a.fitScore ?? 0);
      if (sortBy === "hardSkill") return (b.hardSkillScore ?? 0) - (a.hardSkillScore ?? 0);
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });

  if (isLoading) {
    return <div className="flex items-center justify-center h-96 text-muted-foreground">Loading candidates...</div>;
  }

  return (
    <div className="space-y-4" data-testid="candidate-longlist">
      {/* Search & Sort */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-candidates"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={sortBy === "fit" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("fit")}
            data-testid="button-sort-fit"
          >
            Fit Score
          </Button>
          <Button
            variant={sortBy === "hardSkill" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("hardSkill")}
            data-testid="button-sort-hard-skill"
          >
            Hard Skills
          </Button>
          <Button
            variant={sortBy === "recent" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("recent")}
            data-testid="button-sort-recent"
          >
            Recent
          </Button>
        </div>
      </div>

      {/* Result Count */}
      <div className="text-sm text-muted-foreground">
        {filtered.length} of {candidates.length} candidates
      </div>

      {/* Candidates Grid */}
      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No candidates found
          </div>
        ) : (
          filtered.map((jc) => {
            const candidate = jc.candidate;
            const initials = `${candidate.firstName[0]}${candidate.lastName[0]}`.toUpperCase();
            
            return (
              <Card key={jc.id} className="p-4 hover-elevate cursor-pointer" data-testid={`card-candidate-${jc.id}`}>
                <div className="flex gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate" data-testid={`text-candidate-name-${jc.id}`}>
                      {candidate.firstName} {candidate.lastName}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                      {candidate.currentTitle && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {candidate.currentTitle}
                        </span>
                      )}
                      {candidate.currentCompany && (
                        <span>{candidate.currentCompany}</span>
                      )}
                      {candidate.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {candidate.location}
                        </span>
                      )}
                    </div>

                    {/* Skills Tags */}
                    {candidate.skills && candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {candidate.skills.slice(0, 4).map((skill) => (
                          <Badge key={skill} variant="secondary" className="text-xs py-0">
                            {skill}
                          </Badge>
                        ))}
                        {candidate.skills.length > 4 && (
                          <Badge variant="secondary" className="text-xs py-0">
                            +{candidate.skills.length - 4}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Scores */}
                  <div className="flex items-start gap-6 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Fit Score</div>
                      <div className={`text-3xl font-bold ${getScoreColor(jc.fitScore)}`} data-testid={`text-fit-score-${jc.id}`}>
                        {jc.fitScore ?? "—"}
                      </div>
                      <Badge variant={getScoreBadgeVariant(jc.fitScore)} className="mt-1 text-xs">
                        {jc.status}
                      </Badge>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Hard / Soft</div>
                      <div className="text-sm font-semibold space-y-1">
                        <div>
                          <span className={getScoreColor(jc.hardSkillScore)}>{jc.hardSkillScore ?? "—"}</span>
                          <span className="text-muted-foreground">/70</span>
                        </div>
                        <div>
                          <span className={getScoreColor(jc.softSkillScore)}>{jc.softSkillScore ?? "—"}</span>
                          <span className="text-muted-foreground">/30</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick View Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCandidateId(candidate.id);
                        setIsModalOpen(true);
                      }}
                      data-testid={`button-quick-view-${jc.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Full Profile Link */}
                    <Link href={`/recruiting/candidates/${candidate.id}`}>
                      <Button variant="ghost" size="icon" data-testid={`button-view-profile-${jc.id}`}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        jobId={jobId}
        candidateId={selectedCandidateId}
      />
    </div>
  );
}
