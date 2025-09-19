import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, MapPin, DollarSign, Star } from "lucide-react";

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
  salaryExpectations,
  isAvailable,
  onViewProfile,
  onContact,
}: CandidateCardProps) {
  const initials = `${firstName[0]}${lastName[0]}`;
  const displaySkills = skills.slice(0, 3);
  const remainingSkills = skills.length - 3;

  const getMatchScoreColor = (score?: number) => {
    if (!score) return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
    if (score >= 90) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    if (score >= 75) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    if (score >= 60) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100";
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
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{firstName} {lastName}</h3>
              {matchScore && (
                <Badge className={getMatchScoreColor(matchScore)} data-testid={`badge-match-score-${matchScore}`}>
                  <Star className="h-3 w-3 mr-1" />
                  {matchScore}%
                </Badge>
              )}
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