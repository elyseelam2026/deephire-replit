import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, MapPin, DollarSign, Star, Brain, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CandidateCardProps {
  id: number;
  firstName: string;
  lastName: string;
  currentTitle: string;
  currentCompany: string;
  location: string;
  yearsExperience: number;
  skills: string[];
  matchScore?: number;
  fitScore?: number;
  fitReasoning?: string;
  fitStrengths?: string[];
  fitConcerns?: string[];
  salaryExpectations?: number;
  isAvailable: boolean;
  onViewProfile?: () => void;
  onContact?: () => void;
}

export function CandidateCard({
  id,
  firstName,
  lastName,
  currentTitle,
  currentCompany,
  location,
  yearsExperience,
  skills,
  matchScore,
  fitScore,
  fitReasoning,
  fitStrengths,
  fitConcerns,
  salaryExpectations,
  isAvailable,
  onViewProfile,
  onContact,
}: CandidateCardProps) {
  const initials = `${firstName[0]}${lastName[0]}`;
  const displaySkills = skills.slice(0, 3);
  const remainingSkills = skills.length - 3;

  const getFitScoreColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    if (score >= 90) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100";
    if (score >= 75) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    if (score >= 60) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100";
    return "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-100";
  };

  return (
    <Card className="hover-elevate" data-testid={`card-candidate-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold">{firstName} {lastName}</h3>
              <div className="flex items-center gap-1">
                {fitScore !== undefined && fitScore !== null ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className={getFitScoreColor(fitScore)} data-testid={`badge-fit-score-${fitScore}`}>
                        <Brain className="h-3 w-3 mr-1" />
                        AI Fit: {fitScore}%
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-medium">AI-Powered Fit Analysis</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Evaluated against role requirements, urgency, and success criteria
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : matchScore ? (
                  <Badge className={getFitScoreColor(matchScore)} data-testid={`badge-match-score-${matchScore}`}>
                    <Star className="h-3 w-3 mr-1" />
                    {matchScore}%
                  </Badge>
                ) : null}
              </div>
            </div>
            <p className="text-sm font-medium text-muted-foreground">{currentTitle}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>{currentCompany}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{location}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {fitReasoning && (
          <div className="rounded-md bg-muted/50 p-3 space-y-2 border border-border/50">
            <div className="flex items-start gap-2">
              <Brain className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Why this candidate fits:</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{fitReasoning}</p>
                
                {(fitStrengths && fitStrengths.length > 0) || (fitConcerns && fitConcerns.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                    {fitStrengths && fitStrengths.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                          Key Strengths
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {fitStrengths.slice(0, 3).map((strength, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-green-600 dark:text-green-400">•</span>
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {fitConcerns && fitConcerns.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium flex items-center gap-1">
                          <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          Considerations
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {fitConcerns.slice(0, 3).map((concern, idx) => (
                            <li key={idx} className="flex items-start gap-1">
                              <span className="text-amber-600 dark:text-amber-400">•</span>
                              <span>{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{yearsExperience} years experience</span>
          {salaryExpectations && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>${salaryExpectations.toLocaleString()}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1">
          {displaySkills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs">
              {skill}
            </Badge>
          ))}
          {remainingSkills > 0 && (
            <Badge variant="secondary" className="text-xs">
              +{remainingSkills} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <Badge 
            variant={isAvailable ? "default" : "secondary"}
            className={isAvailable ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" : ""}
          >
            {isAvailable ? "Available" : "Not Available"}
          </Badge>
          <div className="flex gap-2">
            {onViewProfile && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onViewProfile}
                data-testid={`button-view-profile-${id}`}
              >
                View Profile
              </Button>
            )}
            {onContact && (
              <Button 
                size="sm"
                onClick={onContact}
                data-testid={`button-contact-${id}`}
              >
                Contact
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}