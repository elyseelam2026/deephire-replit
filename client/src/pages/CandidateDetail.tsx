import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, Mail, Phone, MapPin, Briefcase, Building, 
  Award, Loader2, ArrowLeft, Globe, Linkedin
} from "lucide-react";
import { Link } from "wouter";

type Candidate = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  currentTitle?: string;
  currentCompany?: string;
  location?: string;
  linkedinUrl?: string;
  skills?: string[];
  cvText?: string;
  bio?: string;
  yearsExperience?: number;
  careerHistory?: any;
};

export default function CandidateDetail() {
  const [, params] = useRoute("/recruiting/candidates/:id");
  const candidateId = params?.id ? parseInt(params.id) : null;

  const { data: candidate, isLoading } = useQuery<Candidate>({
    queryKey: ['/api/candidates', candidateId],
    queryFn: async () => {
      const response = await fetch(`/api/candidates/${candidateId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch candidate');
      }
      return response.json();
    },
    enabled: !!candidateId,
  });

  if (isLoading || !candidate) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();

  return (
    <div className="h-full flex flex-col" data-testid="candidate-detail-page">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center justify-between mb-2">
          <Link href="/recruiting/candidates">
            <Button variant="ghost" size="sm" data-testid="button-back-to-candidates">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Candidates
            </Button>
          </Link>
          {candidate.linkedinUrl && (
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-linkedin"
            >
              <Button variant="outline" size="sm">
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn Profile
              </Button>
            </a>
          )}
        </div>
        <h1 className="text-2xl font-bold" data-testid="candidate-name">{displayName}</h1>
        {candidate.currentTitle && (
          <p className="text-muted-foreground" data-testid="candidate-title">
            {candidate.currentTitle}
            {candidate.currentCompany && ` at ${candidate.currentCompany}`}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl space-y-4">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${candidate.email}`}
                    className="text-primary hover:underline"
                    data-testid="candidate-email"
                  >
                    {candidate.email}
                  </a>
                </div>
              )}
              {candidate.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="candidate-phone">{candidate.phone}</span>
                </div>
              )}
              {candidate.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span data-testid="candidate-location">{candidate.location}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Professional Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Professional Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {candidate.currentTitle && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Current Role</div>
                    <div className="font-medium">{candidate.currentTitle}</div>
                  </div>
                </div>
              )}
              {candidate.currentCompany && (
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Company</div>
                    <div className="font-medium">{candidate.currentCompany}</div>
                  </div>
                </div>
              )}
              {candidate.yearsExperience !== undefined && (
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Experience</div>
                    <div className="font-medium">{candidate.yearsExperience} years</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2" data-testid="candidate-skills">
                  {candidate.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bio */}
          {candidate.bio && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Biography</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap" data-testid="candidate-bio">
                  {candidate.bio}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
