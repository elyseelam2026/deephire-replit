import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Clock, Users } from "lucide-react";

interface JobCardProps {
  id: number;
  title: string;
  company: string;
  location: string;
  department: string;
  urgency: "low" | "medium" | "high" | "urgent";
  matchCount?: number;
  createdAt: string;
  onViewCandidates?: () => void;
  onEdit?: () => void;
}

const urgencyColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

export function JobCard({
  id,
  title,
  company,
  location,
  department,
  urgency,
  matchCount = 0,
  createdAt,
  onViewCandidates,
  onEdit,
}: JobCardProps) {
  return (
    <Card className="hover-elevate" data-testid={`card-job-${id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Building2 className="h-3 w-3" />
                <span>{company}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{location}</span>
              </div>
            </div>
          </div>
          <Badge className={urgencyColors[urgency]} data-testid={`badge-urgency-${urgency}`}>
            {urgency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{new Date(createdAt).toLocaleDateString()}</span>
          </div>
          <Badge variant="secondary">{department}</Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{matchCount} candidates matched</span>
          </div>
          <div className="flex gap-2">
            {onViewCandidates && matchCount > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={onViewCandidates}
                data-testid={`button-view-candidates-${id}`}
              >
                View Candidates
              </Button>
            )}
            {onEdit && (
              <Button 
                size="sm"
                onClick={onEdit}
                data-testid={`button-edit-job-${id}`}
              >
                Edit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}