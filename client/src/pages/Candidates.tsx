import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, MapPin, Briefcase, DollarSign, Search, Mail, Linkedin } from "lucide-react";
import { Candidate } from "@shared/schema";
import { useState } from "react";

export default function Candidates() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: candidates, isLoading, error } = useQuery<Candidate[]>({
    queryKey: ['/api/candidates', searchQuery],
    queryFn: async () => {
      const url = searchQuery 
        ? `/api/candidates?search=${encodeURIComponent(searchQuery)}`
        : '/api/candidates';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      return response.json();
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6" data-testid="candidates-page">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground">Find and manage talent</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6" data-testid="candidates-page">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground">Find and manage talent</p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Failed to load candidates. Please try again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-6 p-6" data-testid="candidates-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground">
            Find and manage talent ({candidates?.length || 0} total)
          </p>
        </div>
        <Button data-testid="button-add-candidate">
          <Users className="h-4 w-4 mr-2" />
          Add Candidate
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-candidates"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {candidates?.map((candidate) => (
          <Card key={candidate.id} className="hover-elevate" data-testid={`candidate-card-${candidate.id}`}>
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(candidate.firstName, candidate.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg" data-testid={`candidate-name-${candidate.id}`}>
                    {candidate.firstName} {candidate.lastName}
                  </CardTitle>
                  {candidate.currentTitle && (
                    <CardDescription data-testid={`candidate-title-${candidate.id}`}>
                      {candidate.currentTitle}
                    </CardDescription>
                  )}
                  {candidate.currentCompany && (
                    <p className="text-sm text-muted-foreground" data-testid={`candidate-company-${candidate.id}`}>
                      at {candidate.currentCompany}
                    </p>
                  )}
                </div>
                {candidate.isAvailable && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                    Available
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {candidate.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span data-testid={`candidate-location-${candidate.id}`}>{candidate.location}</span>
                </div>
              )}
              
              {candidate.yearsExperience && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span data-testid={`candidate-experience-${candidate.id}`}>
                    {candidate.yearsExperience} years experience
                  </span>
                </div>
              )}
              
              {candidate.salaryExpectations && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  <span data-testid={`candidate-salary-${candidate.id}`}>
                    {formatSalary(candidate.salaryExpectations)} expected
                  </span>
                </div>
              )}
              
              {candidate.skills && candidate.skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-1" data-testid={`candidate-skills-${candidate.id}`}>
                    {candidate.skills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {candidate.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{candidate.skills.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              <div className="pt-2 space-y-2">
                <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-candidate-${candidate.id}`}>
                  View Profile
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" data-testid={`button-contact-candidate-${candidate.id}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                  {candidate.linkedinUrl && (
                    <Button variant="secondary" size="sm" data-testid={`button-linkedin-candidate-${candidate.id}`}>
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {candidates?.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'No candidates found' : 'No candidates yet'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery 
                ? `No candidates match "${searchQuery}". Try a different search term.`
                : 'Add candidates to your database to start building your talent pipeline.'
              }
            </p>
            {!searchQuery && (
              <Button data-testid="button-add-first-candidate">
                <Users className="h-4 w-4 mr-2" />
                Add Candidate
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}