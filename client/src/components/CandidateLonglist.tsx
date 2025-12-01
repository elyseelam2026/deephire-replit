import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ExternalLink, MapPin, Briefcase, Eye, Search } from "lucide-react";
import { Link } from "wouter";
import { CandidateDetailModal } from "./CandidateDetailModal";

interface CandidateLonglistProps {
  jobId: number;
}

export default function CandidateLonglist({ jobId }: CandidateLonglistProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"fit" | "recent">("fit");
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch candidates - returns flat structure from real-time API
  const { data: rawCandidates = [], isLoading } = useQuery<Array<any>>({
    queryKey: ['/api/jobs', jobId, 'candidates'],
    enabled: !!jobId,
    refetchInterval: 10000
  });

  // Filter and sort
  const filtered = rawCandidates
    .filter(c => {
      if (!search) return true;
      const text = `${c.firstName} ${c.lastName} ${c.currentTitle || ''} ${c.currentCompany || ''}`.toLowerCase();
      return text.includes(search.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "fit") {
        return (b.matchScore ?? 0) - (a.matchScore ?? 0);
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
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
        {filtered.length} of {rawCandidates.length} candidates
      </div>

      {/* Candidates Grid */}
      <div className="grid gap-4">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {rawCandidates.length === 0 ? "No candidates matched this role yet" : "No candidates found"}
          </div>
        ) : (
          filtered.map((candidate) => {
            const score = candidate.matchScore || 0;
            const initials = candidate.firstName && candidate.lastName 
              ? `${candidate.firstName[0]}${candidate.lastName[0]}`.toUpperCase()
              : "?";
            
            const getScoreColor = (s: number) => {
              if (s >= 85) return "text-green-600 dark:text-green-400 font-bold";
              if (s >= 76) return "text-blue-600 dark:text-blue-400 font-bold";
              if (s >= 66) return "text-yellow-600 dark:text-yellow-400 font-bold";
              if (s >= 60) return "text-orange-600 dark:text-orange-400 font-bold";
              return "text-red-600 dark:text-red-400";
            };

            return (
              <Card 
                key={candidate.id} 
                className="p-4 hover-elevate cursor-pointer" 
                data-testid={`card-candidate-${candidate.id}`}
                onClick={() => {
                  setSelectedCandidateId(candidate.id);
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
                    <h3 className="font-semibold text-base truncate" data-testid={`text-candidate-name-${candidate.id}`}>
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
                    {candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
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

                  {/* Scores & Actions */}
                  <div className="flex items-start gap-4 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground mb-1">Fit Score</div>
                      <div className={`text-3xl font-bold ${getScoreColor(score)}`} data-testid={`text-fit-score-${candidate.id}`}>
                        {score}
                      </div>
                      <Badge 
                        variant={candidate.ineligibilityReason ? "secondary" : "default"} 
                        className="mt-1 text-xs"
                      >
                        {candidate.ineligibilityReason ? "Ineligible" : "Eligible"}
                      </Badge>
                      {candidate.ineligibilityReason && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-500 mt-1 max-w-xs">
                          {candidate.ineligibilityReason}
                        </div>
                      )}
                    </div>

                    {/* Quick View Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidateId(candidate.id);
                        setIsModalOpen(true);
                      }}
                      data-testid={`button-quick-view-${candidate.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>

                    {/* Full Profile Link */}
                    <Link href={`/recruiting/candidates/${candidate.id}`}>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        data-testid={`button-view-profile-${candidate.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
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
