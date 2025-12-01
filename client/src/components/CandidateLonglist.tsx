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
      // Handle both flat structure (from real-time match) and nested structure (from DB)
      const isFlat = !jc.candidate;
      const firstName = isFlat ? (jc as any).firstName : jc.candidate.firstName;
      const lastName = isFlat ? (jc as any).lastName : jc.candidate.lastName;
      const title = isFlat ? (jc as any).currentTitle : jc.candidate.currentTitle;
      const company = isFlat ? (jc as any).currentCompany : jc.candidate.currentCompany;
      
      const text = `${firstName} ${lastName} ${title || ''} ${company || ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "fit") {
        const aScore = (a as any).matchScore ?? (a.fitScore ?? 0);
        const bScore = (b as any).matchScore ?? (b.fitScore ?? 0);
        return bScore - aScore;
      }
      if (sortBy === "hardSkill") return (b.hardSkillScore ?? 0) - (a.hardSkillScore ?? 0);
      const aDate = (a as any).addedAt ? new Date((a as any).addedAt).getTime() : 0;
      const bDate = (b as any).addedAt ? new Date((b as any).addedAt).getTime() : 0;
      return bDate - aDate;
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
            // Handle both flat structure and nested structure
            const isFlat = !(jc as any).candidate;
            const candidate = isFlat ? jc : (jc as any).candidate;
            const firstName = isFlat ? (jc as any).firstName : candidate?.firstName;
            const lastName = isFlat ? (jc as any).lastName : candidate?.lastName;
            const title = isFlat ? (jc as any).currentTitle : candidate?.currentTitle;
            const company = isFlat ? (jc as any).currentCompany : candidate?.currentCompany;
            const location = isFlat ? (jc as any).location : candidate?.location;
            const candidateId = isFlat ? (jc as any).id : candidate?.id;
            const matchScore = (jc as any).matchScore ?? (jc.fitScore ?? 0);
            
            const initials = firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : "?";
            
            return (
              <Card 
                key={jc.id} 
                className="p-4 hover-elevate cursor-pointer" 
                data-testid={`card-candidate-${jc.id}`}
                onClick={() => {
                  setSelectedCandidateId(candidateId);
                  setIsModalOpen(true);
                }}
              >
                <div className="flex gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  {/* Main Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate" data-testid={`text-candidate-name-${jc.id}`}>
                      {firstName} {lastName}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2 flex-wrap">
                      {title && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {title}
                        </span>
                      )}
                      {company && (
                        <span>{company}</span>
                      )}
                      {location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {location}
                        </span>
                      )}
                    </div>

                    {/* Skills Tags */}
                    {candidate && candidate.skills && candidate.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {candidate.skills.slice(0, 4).map((skill: any) => (
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
                      <div className={`text-3xl font-bold ${getScoreColor(matchScore)}`} data-testid={`text-fit-score-${jc.id}`}>
                        {matchScore ?? "—"}
                      </div>
                      <Badge variant={getScoreBadgeVariant(matchScore)} className="mt-1 text-xs">
                        {(jc as any).status || 'eligible'}
                      </Badge>
                    </div>

                    {jc.hardSkillScore !== undefined && (
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
                    )}

                    {/* Quick View Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedCandidateId(candidateId);
                        setIsModalOpen(true);
                      }}
                      data-testid={`button-quick-view-${jc.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Full Profile Link */}
                    <Link href={`/recruiting/candidates/${candidateId}`}>
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
