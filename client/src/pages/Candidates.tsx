import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, MapPin, Briefcase, DollarSign, Search, Mail, Linkedin, ExternalLink, Trash2, Edit, FileText, Building2, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Candidate, CareerHistoryEntry } from "@shared/schema";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Candidates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);
  const [bioDialogOpen, setBioDialogOpen] = useState(false);
  const [bioText, setBioText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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

  const deleteMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      const response = await apiRequest('DELETE', `/api/candidates/${candidateId}`, null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Candidate Deleted",
        description: "The candidate has been removed successfully.",
      });
      setCandidateToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete candidate",
        variant: "destructive",
      });
    },
  });

  const saveBiographyMutation = useMutation({
    mutationFn: async ({ candidateId, biography, bioSource }: { candidateId: number; biography: string; bioSource: string }) => {
      const response = await apiRequest('POST', `/api/admin/save-biography/${candidateId}`, { biography, bioSource });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Biography Saved",
        description: "The biography has been saved successfully.",
      });
      setBioDialogOpen(false);
      setBioText("");
      setSelectedCandidate(null);
    },
    onError: (error: any) => {
      toast({
        title: "Save Failed",
        description: error.message || "Failed to save biography",
        variant: "destructive",
      });
    },
  });

  const generateBiographyMutation = useMutation({
    mutationFn: async (candidateId: number) => {
      console.log('[Biography Gen] Starting mutation for candidate:', candidateId);
      const response = await apiRequest('POST', `/api/admin/generate-biography/${candidateId}`, null);
      console.log('[Biography Gen] Got response, parsing JSON...');
      return response.json();
    },
    onSuccess: () => {
      console.log('[Biography Gen] Success!');
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Biography Generated",
        description: "The biography has been auto-generated from LinkedIn profile using Bright Data.",
      });
    },
    onError: (error: any) => {
      console.error('[Biography Gen] Error:', error);
      console.error('[Biography Gen] Error message:', error.message);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate biography",
        variant: "destructive",
      });
    },
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => setSelectedCandidate(candidate)}
                  data-testid={`button-view-candidate-${candidate.id}`}
                >
                  View Profile
                </Button>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" className="flex-1" data-testid={`button-contact-candidate-${candidate.id}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Contact
                  </Button>
                  {candidate.linkedinUrl && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => window.open(candidate.linkedinUrl!, '_blank')}
                      data-testid={`button-linkedin-candidate-${candidate.id}`}
                    >
                      <Linkedin className="h-4 w-4" />
                    </Button>
                  )}
                  {candidate.bioUrl && (
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => window.open(candidate.bioUrl!, '_blank')}
                      data-testid={`button-bio-candidate-${candidate.id}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={() => setCandidateToDelete(candidate)}
                    data-testid={`button-delete-candidate-${candidate.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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

      {/* Candidate Detail Modal */}
      <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0 flex flex-col" data-testid={`candidate-profile-${selectedCandidate?.id}`}>
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {selectedCandidate?.firstName?.[0]}{selectedCandidate?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              {selectedCandidate?.firstName} {selectedCandidate?.lastName}
            </DialogTitle>
            <DialogDescription>
              Candidate profile and details
            </DialogDescription>
          </DialogHeader>
          
          {selectedCandidate && (
            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 mt-2">
                <TabsTrigger value="overview" data-testid={`tab-overview-${selectedCandidate.id}`}>
                  <Users className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="career" data-testid={`tab-career-${selectedCandidate.id}`}>
                  <Briefcase className="h-4 w-4 mr-2" />
                  Career History
                </TabsTrigger>
                <TabsTrigger value="biography" data-testid={`tab-biography-${selectedCandidate.id}`}>
                  <FileText className="h-4 w-4 mr-2" />
                  Executive Biography
                </TabsTrigger>
              </TabsList>

              <TabsContent value="career" className="flex-1 overflow-y-auto px-6 py-4 space-y-6 m-0">
                {/* Career History Timeline */}
                {selectedCandidate.careerHistory && (selectedCandidate.careerHistory as CareerHistoryEntry[]).length > 0 ? (
                  <div className="space-y-4">
                    {(selectedCandidate.careerHistory as CareerHistoryEntry[]).map((entry, index) => (
                      <div 
                        key={index} 
                        className="border-l-2 border-primary/20 pl-4 pb-4"
                        data-testid={`career-entry-${index}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-base">{entry.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <p className="text-muted-foreground">{entry.company}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {entry.startDate} - {entry.endDate || 'Present'}
                            </span>
                          </div>
                        </div>
                        {entry.location && (
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            <span>{entry.location}</span>
                          </div>
                        )}
                        {entry.description && (
                          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                            {entry.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground text-sm">
                      No career history available yet.
                      {selectedCandidate.linkedinUrl && (
                        <span className="block mt-2">
                          Career data will be extracted when LinkedIn profile is scraped.
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="biography" className="flex-1 overflow-y-auto px-6 py-4 space-y-6 m-0">
                {/* Professional Biography */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      Professional Biography
                      {(selectedCandidate as any).bioStatus === 'not_provided' && (
                        <Badge variant="secondary" className="text-xs">Not Provided</Badge>
                      )}
                      {(selectedCandidate as any).bioStatus === 'inferred' && (
                        <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                      )}
                      {(selectedCandidate as any).bioStatus === 'verified' && (
                        <Badge variant="default" className="text-xs">Verified</Badge>
                      )}
                    </h4>
                  </div>
                  {selectedCandidate.biography ? (
                    <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line p-4 bg-muted/50 rounded-lg" data-testid={`text-biography-${selectedCandidate.id}`}>
                      {selectedCandidate.biography}
                    </div>
                  ) : (
                    <div className="p-8 bg-muted/50 rounded-lg border-2 border-dashed text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground text-sm mb-2">
                        No biography available.
                        {selectedCandidate.linkedinUrl && (
                          <span className="block mt-2">Click the LinkedIn link to view their full profile.</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Career Summary */}
                {selectedCandidate.careerSummary && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Career Highlights</h4>
                    <div className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line p-4 bg-muted/50 rounded-lg" data-testid={`text-career-summary-${selectedCandidate.id}`}>
                      {selectedCandidate.careerSummary}
                    </div>
                  </div>
                )}

                {/* Biography Management Actions */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-sm mb-4">Biography Management</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        if (!selectedCandidate) return;
                        try {
                          const response = await fetch(`/api/admin/validate-biography/${selectedCandidate.id}`, {
                            method: 'POST',
                          });
                          const result = await response.json();
                          
                          if (result.success) {
                            window.open(result.linkedinUrl, '_blank');
                            toast({
                              title: "Manual Verification Required",
                              description: result.note || "Please manually compare biography with LinkedIn profile",
                            });
                          }
                        } catch (error) {
                          toast({
                            title: "Validation Failed",
                            description: "Failed to validate biography",
                            variant: "destructive",
                          });
                        }
                      }}
                      data-testid={`button-verify-biography-${selectedCandidate.id}`}
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Verify Biography
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => {
                        if (!selectedCandidate) return;
                        if (!selectedCandidate.linkedinUrl) {
                          toast({
                            title: "LinkedIn URL Required",
                            description: "Please add a LinkedIn URL first before auto-generating biography",
                            variant: "destructive",
                          });
                          return;
                        }
                        generateBiographyMutation.mutate(selectedCandidate.id);
                      }}
                      disabled={generateBiographyMutation.isPending || !selectedCandidate.linkedinUrl}
                      data-testid={`button-auto-generate-biography-${selectedCandidate.id}`}
                    >
                      <FileText className="h-3 w-3 mr-2" />
                      {generateBiographyMutation.isPending ? "Generating..." : "Auto-Generate Biography"}
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!selectedCandidate) return;
                        setBioText(selectedCandidate.biography || "");
                        setBioDialogOpen(true);
                      }}
                      data-testid={`button-manual-biography-${selectedCandidate.id}`}
                    >
                      <FileText className="h-3 w-3 mr-2" />
                      {selectedCandidate.biography ? "Edit Biography" : "Add Biography Manually"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="overview" className="flex-1 overflow-y-auto px-6 py-4 space-y-6 m-0">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedCandidate.email && (
                    <div>
                      <h4 className="font-medium text-sm flex items-center gap-2">
                        Email
                        {(selectedCandidate as any).emailStatus === 'inferred' && (
                          <Badge variant="secondary" className="text-xs">Inferred</Badge>
                        )}
                        {(selectedCandidate as any).emailStatus === 'verified' && (
                          <Badge variant="default" className="text-xs">Verified</Badge>
                        )}
                      </h4>
                      <p className="text-muted-foreground">{selectedCandidate.email}</p>
                    </div>
                  )}
                  {selectedCandidate.phoneNumber && (
                    <div>
                      <h4 className="font-medium text-sm">Phone</h4>
                      <p className="text-muted-foreground">{selectedCandidate.phoneNumber}</p>
                    </div>
                  )}
                  {selectedCandidate.location && (
                    <div>
                      <h4 className="font-medium text-sm">Location</h4>
                      <p className="text-muted-foreground">{selectedCandidate.location}</p>
                    </div>
                  )}
                  {selectedCandidate.currentTitle && (
                    <div>
                      <h4 className="font-medium text-sm">Current Role</h4>
                      <p className="text-muted-foreground">{selectedCandidate.currentTitle}</p>
                    </div>
                  )}
                </div>

                {selectedCandidate.salaryExpectations && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Salary Expectations</h4>
                    <p className="text-muted-foreground">{formatSalary(selectedCandidate.salaryExpectations)}</p>
                  </div>
                )}

                {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.skills.map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Profile Links */}
                <div className="flex gap-4">
                  {selectedCandidate.linkedinUrl && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">LinkedIn Profile</h4>
                      <a 
                        href={selectedCandidate.linkedinUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                        data-testid={`link-linkedin-${selectedCandidate.id}`}
                      >
                        View LinkedIn Profile
                      </a>
                    </div>
                  )}
                  {selectedCandidate.bioUrl && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Bio Page</h4>
                      <a 
                        href={selectedCandidate.bioUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline"
                        data-testid={`link-bio-${selectedCandidate.id}`}
                      >
                        View Bio Profile
                      </a>
                    </div>
                  )}
                </div>

                {selectedCandidate.isAvailable !== undefined && (
                  <div>
                    <h4 className="font-medium text-sm mb-2">Availability</h4>
                    <Badge variant={selectedCandidate.isAvailable ? "default" : "secondary"}>
                      {selectedCandidate.isAvailable ? "Available" : "Not Available"}
                    </Badge>
                  </div>
                )}
              
              {/* QA Validation Section */}
              <div className="border-t pt-6">
                <h4 className="font-medium text-sm mb-4">QA Validation</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!selectedCandidate) return;
                      try {
                        const response = await fetch(`/api/admin/validate-email/${selectedCandidate.id}`, {
                          method: 'POST',
                        });
                        const result = await response.json();
                        
                        if (result.success && result.suggestedEmail && !result.isMatch) {
                          const confirmed = window.confirm(
                            `Email Validation Result:\n\n` +
                            `Current: ${result.currentEmail}\n` +
                            `Suggested: ${result.suggestedEmail}\n\n` +
                            `Would you like to update to the suggested email?`
                          );
                          
                          if (confirmed) {
                            const updateResponse = await fetch(`/api/admin/update-candidate-email/${selectedCandidate.id}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email: result.suggestedEmail })
                            });
                            
                            if (updateResponse.ok) {
                              queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
                              toast({
                                title: "Email Updated",
                                description: `Email updated to ${result.suggestedEmail}`,
                              });
                              setSelectedCandidate(null);
                            }
                          }
                        } else if (result.isMatch) {
                          toast({
                            title: "Email Verified",
                            description: "Email is correct!",
                          });
                        } else {
                          toast({
                            title: "Could Not Validate",
                            description: result.message || "Unable to determine company email domain",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Validation Failed",
                          description: "Failed to validate email",
                          variant: "destructive",
                        });
                      }
                    }}
                    data-testid={`button-verify-email-${selectedCandidate.id}`}
                  >
                    <Mail className="h-3 w-3 mr-2" />
                    Verify Email
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!selectedCandidate) return;
                      try {
                        const response = await fetch(`/api/admin/validate-linkedin/${selectedCandidate.id}`, {
                          method: 'POST',
                        });
                        const result = await response.json();
                        
                        if (result.success && result.suggestedLinkedinUrl && !result.isMatch) {
                          const confirmed = window.confirm(
                            `LinkedIn URL Validation Result:\n\n` +
                            `Current: ${result.currentLinkedinUrl}\n` +
                            `Suggested: ${result.suggestedLinkedinUrl}\n\n` +
                            `Would you like to update to the suggested URL?`
                          );
                          
                          if (confirmed) {
                            const updateResponse = await fetch(`/api/admin/update-candidate-linkedin/${selectedCandidate.id}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ linkedinUrl: result.suggestedLinkedinUrl })
                            });
                            
                            if (updateResponse.ok) {
                              queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
                              toast({
                                title: "LinkedIn URL Updated",
                                description: "LinkedIn profile URL has been updated",
                              });
                              setSelectedCandidate(null);
                            }
                          }
                        } else if (result.isMatch) {
                          toast({
                            title: "LinkedIn URL Verified",
                            description: "LinkedIn URL is correct!",
                          });
                        } else {
                          toast({
                            title: "Could Not Validate",
                            description: "Unable to find alternative LinkedIn profile",
                            variant: "destructive",
                          });
                        }
                      } catch (error) {
                        toast({
                          title: "Validation Failed",
                          description: "Failed to validate LinkedIn URL",
                          variant: "destructive",
                        });
                      }
                    }}
                    data-testid={`button-verify-linkedin-${selectedCandidate.id}`}
                  >
                    <Linkedin className="h-3 w-3 mr-2" />
                    Verify LinkedIn URL
                  </Button>
                </div>
              </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!candidateToDelete} onOpenChange={() => setCandidateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {candidateToDelete?.firstName} {candidateToDelete?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => candidateToDelete && deleteMutation.mutate(candidateToDelete.id)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Biography Entry Dialog */}
      <Dialog open={bioDialogOpen} onOpenChange={setBioDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCandidate?.biography ? "Edit Biography" : "Add Biography"}
            </DialogTitle>
            <DialogDescription>
              Enter or paste the candidate's professional biography. You can manually type it or copy it from their LinkedIn profile after verifying it's the correct person.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="biography-text">Biography</Label>
              <Textarea
                id="biography-text"
                placeholder="Enter professional biography here..."
                value={bioText}
                onChange={(e) => setBioText(e.target.value)}
                rows={12}
                className="resize-none"
                data-testid="textarea-biography"
              />
              <p className="text-xs text-muted-foreground">
                This biography will be marked as manually entered. Make sure to verify the LinkedIn profile first.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setBioDialogOpen(false);
                  setBioText("");
                }}
                data-testid="button-cancel-biography"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedCandidate || !bioText.trim()) {
                    toast({
                      title: "Biography Required",
                      description: "Please enter a biography before saving",
                      variant: "destructive",
                    });
                    return;
                  }
                  saveBiographyMutation.mutate({
                    candidateId: selectedCandidate.id,
                    biography: bioText.trim(),
                    bioSource: "manual"
                  });
                }}
                disabled={saveBiographyMutation.isPending || !bioText.trim()}
                data-testid="button-save-biography"
              >
                {saveBiographyMutation.isPending ? "Saving..." : "Save Biography"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}